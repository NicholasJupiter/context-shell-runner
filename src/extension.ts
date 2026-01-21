import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface CommandConfig {
	description: string;
	command: string;
	when?: 'file' | 'folder' | 'any';
	shell?: string;
	loginShell?: boolean;
}

interface CommandsConfig {
	[key: string]: CommandConfig;
}

interface QuickPickCommandItem extends vscode.QuickPickItem {
	commandKey: string;
	config: CommandConfig;
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Context Shell Runner is now active!');

	const disposable = vscode.commands.registerCommand('context-shell-runner.run', async (uri: vscode.Uri) => {
		// 如果没有传入 uri，尝试从 Explorer 获取当前选中的资源
		if (!uri) {
			vscode.window.showErrorMessage('请在资源管理器中右键点击文件或文件夹使用此命令');
			return;
		}

		const fsPath = uri.fsPath;

		// 判断资源类型
		let isFile = false;
		let isFolder = false;
		try {
			const stat = fs.statSync(fsPath);
			isFile = stat.isFile();
			isFolder = stat.isDirectory();
		} catch (error) {
			vscode.window.showErrorMessage(`无法访问资源: ${fsPath}`);
			return;
		}

		// 读取用户配置
		const config = vscode.workspace.getConfiguration('contextShellRunner');
		const commands: CommandsConfig = config.get('commands') || {};

		// 检查是否有配置的命令
		if (Object.keys(commands).length === 0) {
			vscode.window.showWarningMessage('未配置任何命令。请在 settings.json 中配置 contextShellRunner.commands');
			return;
		}

		// 根据资源类型过滤可用命令
		const resourceType = isFile ? 'file' : 'folder';
		const availableCommands: QuickPickCommandItem[] = [];

		for (const [key, cmdConfig] of Object.entries(commands)) {
			const when = cmdConfig.when || 'any';
			if (when === 'any' || when === resourceType) {
				availableCommands.push({
					label: cmdConfig.description || key,
					description: key,
					detail: cmdConfig.command,
					commandKey: key,
					config: cmdConfig
				});
			}
		}

		if (availableCommands.length === 0) {
			vscode.window.showWarningMessage(`没有适用于${isFile ? '文件' : '文件夹'}的命令`);
			return;
		}

		// 使用 QuickPick 让用户选择命令
		const selected = await vscode.window.showQuickPick(availableCommands, {
			placeHolder: '选择要执行的命令',
			matchOnDescription: true,
			matchOnDetail: true
		});

		if (!selected) {
			return;
		}

		// 准备变量
		const variables = buildVariables(fsPath, isFile, isFolder);

		// 替换变量
		let finalCommand = replaceVariables(selected.config.command, variables);

		// 构造 shell 命令
		const shell = selected.config.shell || 'bash';
		const loginShell = selected.config.loginShell ?? false;
		const shellFlag = loginShell ? '-lc' : '-c';

		// 创建或复用终端
		const terminalName = 'Context Shell Runner';
		let terminal = vscode.window.terminals.find(t => t.name === terminalName);
		if (!terminal) {
			terminal = vscode.window.createTerminal(terminalName);
		}

		// 先 cd 到目标目录，然后执行命令
		const targetDir = isFile ? path.dirname(fsPath) : fsPath;
		const escapedCommand = finalCommand.replace(/"/g, '\\"');
		const fullCommand = `cd "${targetDir}" && ${shell} ${shellFlag} "${escapedCommand}"`;

		terminal.show();
		terminal.sendText(fullCommand);

		vscode.window.showInformationMessage(`正在执行: ${selected.config.description || selected.commandKey}`);
	});

	context.subscriptions.push(disposable);
}

function buildVariables(fsPath: string, isFile: boolean, isFolder: boolean): Record<string, string> {
	const variables: Record<string, string> = {
		path: fsPath,
		dir: isFile ? path.dirname(fsPath) : fsPath,
		name: path.basename(fsPath),
		isFile: String(isFile),
		isFolder: String(isFolder),
		workspace: ''
	};

	// 获取 workspace 根目录
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders && workspaceFolders.length > 0) {
		variables.workspace = workspaceFolders[0].uri.fsPath;
	}

	return variables;
}

function replaceVariables(command: string, variables: Record<string, string>): string {
	let result = command;
	for (const [key, value] of Object.entries(variables)) {
		result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
	}
	return result;
}

export function deactivate() {}
