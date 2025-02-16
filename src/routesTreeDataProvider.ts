import * as vscode from 'vscode';
import { Route } from './routeParser';
import * as path from 'path';

export class RoutesTreeItem extends vscode.TreeItem {
    constructor(
        public readonly route: Route,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(route.path, collapsibleState);
        const fileName = path.basename(route.filePath);
        this.tooltip = `${route.method} ${route.path}\nFile: ${fileName}`;
        this.description = `${route.method} - ${fileName}`;
        this.iconPath = new vscode.ThemeIcon(this.getMethodIcon(route.method));
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(route.filePath), { selection: new vscode.Range(route.lineNumber - 1, 0, route.lineNumber - 1, 0) }]
        };
    }

    private getMethodIcon(method: string): string {
        switch (method.toLowerCase()) {
            case 'get': return 'symbol-array';
            case 'post': return 'add';
            case 'put': return 'edit';
            case 'delete': return 'trash';
            case 'patch': return 'sync';
            default: return 'symbol-method';
        }
    }
}

export class RoutesTreeDataProvider implements vscode.TreeDataProvider<RoutesTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RoutesTreeItem | undefined | null | void> = new vscode.EventEmitter<RoutesTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RoutesTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private routes: Route[] = [];

    refresh(routes: Route[]): void {
        this.routes = routes;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RoutesTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RoutesTreeItem): Thenable<RoutesTreeItem[]> {
        if (element) {
            return Promise.resolve([]);
        }

        return Promise.resolve(
            this.routes.map(route => new RoutesTreeItem(route, vscode.TreeItemCollapsibleState.None))
        );
    }
}