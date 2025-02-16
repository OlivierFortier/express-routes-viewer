import * as vscode from 'vscode';
import { Route } from './routeParser';
import * as path from 'path';

export class RoutesTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly route?: Route,
        public readonly filePath?: string,
        public readonly fileRoutes?: Route[]
    ) {
        super(label, collapsibleState);

        if (route) {
            this.tooltip = `${route.method} ${route.path}`;
            this.description = route.method;
            const methodColor = this.getMethodThemeColor(route.method);

            // Set method color using ThemeColor for the icon
            this.iconPath = new vscode.ThemeIcon(
                this.getMethodIcon(route.method),
                methodColor
            );

            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(route.filePath), { selection: new vscode.Range(route.lineNumber - 1, 0, route.lineNumber - 1, 0) }]
            };
        } else if (filePath) {
            const fileName = path.basename(filePath);
            this.tooltip = `${fileName} (${fileRoutes?.length} routes)`;
            this.description = `${fileRoutes?.length} routes`;
            this.iconPath = new vscode.ThemeIcon('file');
        }
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

    private getMethodThemeColor(method: string): vscode.ThemeColor | undefined {
        switch (method.toLowerCase()) {
            case 'get':
                return new vscode.ThemeColor('expressRoutesViewer.getMethodColor');
            case 'post':
                return new vscode.ThemeColor('expressRoutesViewer.postMethodColor');
            case 'put':
                return new vscode.ThemeColor('expressRoutesViewer.putMethodColor');
            case 'delete':
                return new vscode.ThemeColor('expressRoutesViewer.deleteMethodColor');
            case 'patch':
                return new vscode.ThemeColor('expressRoutesViewer.patchMethodColor');
            default:
                return undefined;
        }
    }
}

export class RoutesTreeDataProvider implements vscode.TreeDataProvider<RoutesTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RoutesTreeItem | undefined | null | void> = new vscode.EventEmitter<RoutesTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RoutesTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private routes: Route[] = [];
    private fileGroups: Map<string, Route[]> = new Map();

    private groupRoutesByFile(routes: Route[]): Map<string, Route[]> {
        const groups = new Map<string, Route[]>();
        for (const route of routes) {
            const existing = groups.get(route.filePath) || [];
            existing.push(route);
            groups.set(route.filePath, existing);
        }
        return groups;
    }

    refresh(routes: Route[]): void {
        this.routes = routes;
        this.fileGroups = this.groupRoutesByFile(routes);
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RoutesTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RoutesTreeItem): Thenable<RoutesTreeItem[]> {
        if (!element) {
            // Root level - show files
            const items: RoutesTreeItem[] = [];
            for (const [filePath, routes] of this.fileGroups) {
                items.push(new RoutesTreeItem(
                    path.basename(filePath),
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    filePath,
                    routes
                ));
            }
            return Promise.resolve(items.sort((a, b) => a.label.localeCompare(b.label)));
        }

        if (element.fileRoutes) {
            // Show routes in the file
            return Promise.resolve(
                element.fileRoutes
                    .sort((a, b) => a.path.localeCompare(b.path))
                    .map(route => new RoutesTreeItem(
                        route.path,
                        vscode.TreeItemCollapsibleState.None,
                        route
                    ))
            );
        }

        return Promise.resolve([]);
    }
}