import exec = require('@actions/exec');
import core = require('@actions/core');
import io = require('@actions/io');
import path = require('path');
import fs = require('fs');

const pidFile = path.join(process.env.RUNNER_TEMP, 'unity-process-id.txt');
let isCancelled = false;

async function ExecUnityPwsh(editorPath: string, args: string[]): Promise<void> {
    const logPath = getLogFilePath(args);
    const pwsh = await io.which('pwsh', true);
    const unity = path.resolve(__dirname, `unity.ps1`);
    process.on('SIGINT', async () => {
        await TryKillPid(pidFile);
        isCancelled = true;
    });
    process.on('SIGTERM', async () => {
        await TryKillPid(pidFile);
        isCancelled = true;
    });
    const exitCode = await exec.exec(`"${pwsh}" -Command`, [`${unity} -EditorPath '${editorPath}' -Arguments '${args.join(` `)}' -LogPath '${logPath}'`], {
        listeners: {
            stdline: (data) => {
                const line = data.toString().trim();
                if (line && line.length > 0) {
                    core.info(line);
                }
            }
        },
        silent: true,
        ignoreReturnCode: true
    });
    if (!isCancelled) {
        await TryKillPid(pidFile);
        if (exitCode !== 0) {
            throw Error(`Unity failed with exit code ${exitCode}`);
        }
    }
}

function getLogFilePath(args: string[]): string {
    const logFileIndex = args.indexOf('-logFile');
    if (logFileIndex === -1) {
        throw Error('Missing -logFile argument');
    }
    return args[logFileIndex + 1];
}

async function TryKillPid(pidFile: string): Promise<void> {
    try {
        await fs.promises.access(pidFile, fs.constants.R_OK);
        try {
            const fd = await fs.promises.open(pidFile, 'r');
            const pid = await fd.readFile('utf8');
            core.debug(`Attempting to kill Unity process with pid: ${pid}`);
            process.kill(parseInt(pid));
            await fd.close();
        } catch (error) {
            if (error.code !== 'ENOENT' && error.code !== 'ESRCH') {
                core.error(`Failed to kill Unity process:\n${JSON.stringify(error)}`);
            }
        } finally {
            await fs.promises.unlink(pidFile);
        }
    } catch (error) {
        // nothing
    }
}

export { ExecUnityPwsh }
