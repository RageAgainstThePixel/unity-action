import { ValidateInputs } from './inputs';
import { ExecUnityPwsh } from './unity';
import core = require('@actions/core');

const main = async () => {
    try {
        const [editor, args] = await ValidateInputs();
        await ExecUnityPwsh(editor, args);
    } catch (error) {
        core.setFailed(error.message);
    }
}

main();
