import * as vscode from 'vscode';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path'; 

async function fetchContestProblems(contestId: string) {
    const response = await axios.get(`https://codeforces.com/api/contest.standings?contestId=${contestId}`);
    if (response.data.status !== 'OK') {
        throw new Error('Не удалось получить задачи контеста');
    }
    return response.data.result.problems;
}

async function createFilesForProblems(problems: any[], baseDir: string, template: string, contestId: string) {
    const solutionsDir = path.join(baseDir, 'solutions/' + contestId);
    fs.mkdirSync(solutionsDir, { recursive: true });

    for (const problem of problems) {
        const problemName = problem.index; // *i.e: A, B, C1, C2, ...
        const solutionFilePath = path.join(solutionsDir, `${problemName}.cpp`);

        const templateContent = fs.readFileSync(template, 'utf-8');
        const filledTemplate = templateContent.replace(/{{problemName}}/g, problemName);
        fs.writeFileSync(solutionFilePath, filledTemplate);
    }
}

export function activate(context: vscode.ExtensionContext) {
    let getRound = vscode.commands.registerCommand('extension.startContest', async () => {
        const contestId = await vscode.window.showInputBox({ prompt: 'Введите ID контеста Codeforces' });
        if (contestId) {
            try {
                const problems = await fetchContestProblems(contestId);
                const baseDir = vscode.workspace.rootPath || '';
                const config = vscode.workspace.getConfiguration('myExtension');
                let templatePath = config.get<string>('templatePath');

                if (!templatePath) {
                    templatePath = await vscode.window.showInputBox({ prompt: 'Введите путь к шаблону для решений (например, /path/to/template.cpp)' });
                    if (templatePath && fs.existsSync(templatePath)) {
                        await vscode.workspace.getConfiguration('myExtension').update('templatePath', templatePath, vscode.ConfigurationTarget.Global);
                    } else {
                        vscode.window.showErrorMessage('Шаблон не найден или не указан.');
                        return;
                    }
                }

                await createFilesForProblems(problems, baseDir, templatePath, contestId);
                vscode.window.showInformationMessage('Файлы для задач созданы!');
            } catch (error) {
				const e = error as Error;
                vscode.window.showErrorMessage(`Ошибка: ${e.message}`);
            }
        }
    });
    context.subscriptions.push(getRound);

    let changeTemplate = vscode.commands.registerCommand('extension.getNewTemplate', async () => {
        try{ 
            const baseDir = vscode.workspace.rootPath || '';
            let templatePath = baseDir + await vscode.window.showInputBox({ prompt: 'Введите путь к шаблону для решений (например, /path/to/template.cpp) \n Текущий: '
                                                                             + vscode.workspace.getConfiguration('myExtension').get<string>('templatePath') });
            if (templatePath && fs.existsSync(templatePath)) {
                await vscode.workspace.getConfiguration('myExtension').update('templatePath', templatePath, vscode.ConfigurationTarget.Global);
            } else {
                vscode.window.showErrorMessage('Шаблон не найден или не указан.');
                return;
            }
        } catch(error) {
            const e = error as Error;
            vscode.window.showErrorMessage(`Ошибка: ${e.message}`);
        }
    });
    context.subscriptions.push(changeTemplate);

}

export function deactivate() {}