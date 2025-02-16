import * as vscode from 'vscode';
import { Route } from './routeParser';
import * as path from 'path';

interface RouteGroup {
    prefix: string;
    routes: Route[];
    subgroups: { [key: string]: RouteGroup };
}

export class RoutesTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly route?: Route,
        public readonly routeGroup?: RouteGroup
    ) {
        super(label, collapsibleState);

        if (route) {
            const fileName = path.basename(route.filePath);
            this.tooltip = `${route.method} ${route.path}\nFile: ${fileName}`;
            this.description = `${route.method} - ${fileName}`;
            this.iconPath = new vscode.ThemeIcon(this.getMethodIcon(route.method));
            this.command = {
                command: 'vscode.open',
                title: 'Open File',
                arguments: [vscode.Uri.file(route.filePath), { selection: new vscode.Range(route.lineNumber - 1, 0, route.lineNumber - 1, 0) }]
            };
        } else if (routeGroup) {
            this.tooltip = `${routeGroup.routes.length} routes`;
            this.description = `${routeGroup.routes.length} routes`;
            this.iconPath = new vscode.ThemeIcon('folder');
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
}

export class RoutesTreeDataProvider implements vscode.TreeDataProvider<RoutesTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RoutesTreeItem | undefined | null | void> = new vscode.EventEmitter<RoutesTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RoutesTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private routes: Route[] = [];
    private rootGroup: RouteGroup = { prefix: '', routes: [], subgroups: {} };

    private groupRoutes(routes: Route[]): RouteGroup {
        const root: RouteGroup = { prefix: '', routes: [], subgroups: {} };

        for (const route of routes) {
            const segments = route.path.split('/').filter(s => s);
            let currentGroup = root;
            let currentPath = '';

            if (segments.length === 0) {
                root.routes.push(route);
                continue;
            }

            for (let i = 0; i < segments.length - 1; i++) {
                const segment = segments[i];
                currentPath += '/' + segment;

                if (!currentGroup.subgroups[segment]) {
                    currentGroup.subgroups[segment] = {
                        prefix: currentPath,
                        routes: [],
                        subgroups: {}
                    };
                }
                currentGroup = currentGroup.subgroups[segment];
            }

            currentGroup.routes.push(route);
        }

        return root;
    }

    refresh(routes: Route[]): void {
        this.routes = routes;
        this.rootGroup = this.groupRoutes(routes);
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: RoutesTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RoutesTreeItem): Thenable<RoutesTreeItem[]> {
        if (!element) {
            // Root level
            const items: RoutesTreeItem[] = [];

            // Add root-level routes
            for (const route of this.rootGroup.routes) {
                items.push(new RoutesTreeItem(route.path, vscode.TreeItemCollapsibleState.None, route));
            }

            // Add groups
            for (const [prefix, group] of Object.entries(this.rootGroup.subgroups)) {
                items.push(new RoutesTreeItem(
                    prefix,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    group
                ));
            }

            return Promise.resolve(items);
        }

        if (element.routeGroup) {
            const items: RoutesTreeItem[] = [];

            // Add routes in this group
            for (const route of element.routeGroup.routes) {
                const relativePath = route.path.substring(element.routeGroup.prefix.length) || '/';
                items.push(new RoutesTreeItem(relativePath, vscode.TreeItemCollapsibleState.None, route));
            }

            // Add subgroups
            for (const [prefix, group] of Object.entries(element.routeGroup.subgroups)) {
                items.push(new RoutesTreeItem(
                    prefix,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    group
                ));
            }

            return Promise.resolve(items);
        }

        return Promise.resolve([]);
    }
}