import {command, program, Program} from 'bandersnatch';
import {Request, WARDuino} from 'warduino-comms';
import {Debugger} from './debugger';
import State = WARDuino.State;

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
        command('exit')
            .description('Exit the REPL')
            .action(async () => {
                console.log('shutting down connections');
                instances.forEach((instance) => instance.connection!.kill());
                process.exit(0);
            })
    );

repl.repl();

