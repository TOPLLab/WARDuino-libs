export function getFileExtension(file: string): string {
    let splitted = file.split('.');
    if (splitted.length === 2) {
        return splitted.pop()!;
    }
    throw Error('Could not determine file type');
}
