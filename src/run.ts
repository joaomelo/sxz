import readline from 'readline';
import { Readable } from 'stream';
import { spawn } from 'child_process';
import { Reset } from "./colors";
import { Script, Command, Composition } from './script';

export async function run(script: Script): Promise<number> {
  if (isCommand(script)) return once(script)

  switch (script.mode) {
    case "SERIAL": return serial(script);
    case "PARALLEL": return 1;
    case "RACE": return 1;
  }
}

function isCommand(script: Script): script is Command {
  return (script as Command).instruction !== undefined;
}

async function serial(composition: Composition): Promise<number> {
  let code = 0;
  for (const script of composition.scripts) {
    code = await run(script);
    if (code !== 0) break;
  }
  return code;
}


function once(command: Command): Promise<number> {
  return new Promise(resolve => {
    const tag = createTag(command);
    console.info(`${tag}started`);

    // const scriptEnv = parseEnv({ file: envFile, vars: envVars });

    const runningProcess = spawn(command.instruction, {
      shell: true
      // env: scriptEnv
    });

    // killer.kill = () => runningProcess.kill();

    tagToConsole(tag, runningProcess.stdout);
    tagToConsole(tag, runningProcess.stderr);

    runningProcess.on('close', code => {
      const finalCode = code === null ? 1 : code;
      console.info(`${tag}exited with code ${finalCode}`);
      resolve(finalCode);
    });
  });

}

function createTag(command: Command): string {
  const bgColor = command.bgColor || Reset;
  const textColor = command.textColor || Reset;
  const { name } = command;
  const tag = `${bgColor}${textColor}[${name}]${Reset} `;
  return tag;
}

function tagToConsole(tag: string, stream: Readable) {
  const rl = readline.createInterface({
    input: stream,
    terminal: false
  })
  rl.on('line', line => console.info(`${tag}${line}`));
}
