import {command, program, Program} from 'bandersnatch';
import {Ack, Exception, Request, SourceMap, WARDuino, WASM} from 'warduino-comms';
import {Debugger} from './debugger';
import State = WARDuino.State;
import Closure = SourceMap.Closure;

const instances: Debugger[] = [];

const repl: Program = program({exit: false})
    .add(
        command('spawn')
            .description('Start and connect')
            .option('program', {
                description: 'Source program (.wat, .ts)',
                default: 'blink.ts',
                required: true,
                prompt: 'WAT or AS program file',
            })
            .option('platform', {
                description: 'Target platform',
                default: 'emulator',
                choices: ['emulator', 'arduino'],
                required: true,
                prompt: 'Target platform',
            })
            .option('port', {
                description: 'Port address',
                default: '8900',
                required: true,
                prompt: 'Port address',
            })
            .action(async (args) => {
                instances.push(await new Debugger(args.program, args.port, args.platform).launch());
            })
    ).add(
        command('list')
            .description('List connections')
            .action(async () => {
                console.log(instances);
            })
    ).add(
        command('inspect')
            .description('Inspect state')
            .action(async () => {
                const response: State = await instances[0].connection!.sendRequest(Request.dump);
                console.log(`${JSON.stringify(response, null, 4)}`);
            })
    ).add(
        command('map')
            .description('Get mapping')
            .action(async () => {
                console.log(`${JSON.stringify(instances[0].mapping, null, 4)}`);
            })
    ).add(
        command('location')
            .description('Get current location')
            .action(async () => {
                const response: State = await instances[0].connection!.sendRequest(Request.dump);
                console.log(`Current line: ${instances[0].mapping?.originalPosition({address: response.pc!})?.line}`);
            })
    ).add(
        command('step')
            .description('Get current location')
            .action(async () => {
                const response: Ack = await instances[0].connection!.sendRequest(Request.step);
                console.log(`Stepping: ${response.text}`);
            })
    ).add(
        command('invoke')
            .description('Invoke a Wasm function')
            .argument('name', {description: 'function name', type: 'string'})
            .argument('args', {description: 'arguments for function', type: 'string', default: ''})
            .action(async (args) => {
                const closure = instances[0].mapping?.functions.find((closure: Closure) => closure.name === args.name);
                const response: State | Exception = await instances[0].connection!.sendRequest(Request.invoke(closure?.index!, args.args.split(' ').map((arg: string) => {
                    const elems: string[] = arg.split(':');
                    return {type: WASM.typing.get(elems[0]) ?? WASM.Type.i32, value: +elems[1]} as WASM.Value;
                })));
                console.log(response);
            })
    ).add(
        command('exit')
            .description('Exit the REPL')
            .action(async () => {
                console.log('shutting down connections');
                instances.forEach((instance) => instance.connection!.kill());
                process.exit(0);
            })
    );

repl.repl();

