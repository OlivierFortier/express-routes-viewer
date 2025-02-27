import * as vscode from 'vscode';
import { RouteParser, Route, RouteParserConfig } from './routeParser';
import { RoutesTreeDataProvider } from './routesTreeDataProvider';
import { RouteVisualizerPanel } from './routeVisualizerPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Express Routes Viewer is now active');

    const routesProvider = new RoutesTreeDataProvider();
    vscode.window.registerTreeDataProvider('expressRoutesView', routesProvider);

    async function refreshRoutes(): Promise<Route[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('Please open a workspace first');
            return [];
        }

        try {
            const config = vscode.workspace.getConfiguration('expressRoutesViewer');
            const parserConfig: RouteParserConfig = {
                includePattern: config.get('includePattern') || '**/*.{js,ts}',
                excludeFolders: config.get('excludeFolders') || ['node_modules', 'dist', 'build'],
                sortBy: (config.get('sortBy') || 'path') as 'method' | 'path' | 'file'
            };

            const parser = new RouteParser(parserConfig);
            const routes = await parser.parseRoutes(workspaceFolders[0].uri.fsPath);
            routesProvider.refresh(routes);
            return routes;
        } catch (error) {
            vscode.window.showErrorMessage('Error parsing Express routes: ' + error);
            return [];
        }
    }

    // Register the visualization command
    const visualizeCommand = vscode.commands.registerCommand('extension.visualizeExpressRoutes', async () => {
        const routes = await refreshRoutes();
        if (routes && routes.length > 0) {
            RouteVisualizerPanel.render(routes, context);
        }
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('extension.showExpressRoutes', refreshRoutes),
        vscode.commands.registerCommand('expressRoutesView.refresh', refreshRoutes),
        visualizeCommand
    );

    // Initial load of routes
    refreshRoutes();
}

export function deactivate() {}
