import * as vscode from 'vscode';
import { Route } from './routeParser';

export class RouteVisualizerPanel {
    public static currentPanel: RouteVisualizerPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static render(routes: Route[], context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (RouteVisualizerPanel.currentPanel) {
            RouteVisualizerPanel.currentPanel._panel.reveal(column);
            RouteVisualizerPanel.currentPanel.updateContent(routes);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'routeVisualizer',
                'Express Routes Visualization',
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            RouteVisualizerPanel.currentPanel = new RouteVisualizerPanel(panel);
            RouteVisualizerPanel.currentPanel.updateContent(routes);
        }
    }

    private updateContent(routes: Route[]) {
        this._panel.webview.html = this.getWebviewContent(routes);
    }

    private getWebviewContent(routes: Route[]) {
        const mermaidDefinition = this.generateMermaidDiagram(routes);

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Express Routes Visualization</title>
            <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
            <style>
                body {
                    padding: 20px;
                    margin: 0;
                    overflow: hidden;
                }
                .container {
                    position: relative;
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                }
                .mermaid {
                    position: relative;
                    transform-origin: 0 0;
                    cursor: grab;
                }
                .mermaid:active {
                    cursor: grabbing;
                }
                .controls {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: var(--vscode-editor-background);
                    padding: 10px;
                    border-radius: 4px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                    z-index: 1000;
                }
                .controls button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    margin: 0 4px;
                    border-radius: 2px;
                    cursor: pointer;
                }
                .controls button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                #zoom-level {
                    color: var(--vscode-foreground);
                    margin: 0 8px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="mermaid">
                    ${mermaidDefinition}
                </div>
                <div class="controls">
                    <button id="zoom-in">+</button>
                    <span id="zoom-level">100%</span>
                    <button id="zoom-out">-</button>
                    <button id="reset">Reset</button>
                </div>
            </div>
            <script>
                mermaid.initialize({
                    startOnLoad: true,
                    theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default'
                });

                let zoom = 1;
                let pan = { x: 0, y: 0 };
                let isDragging = false;
                let startPan = { x: 0, y: 0 };
                let startPoint = { x: 0, y: 0 };

                const container = document.querySelector('.container');
                const mermaidDiv = document.querySelector('.mermaid');
                const zoomLevel = document.getElementById('zoom-level');

                function updateTransform() {
                    mermaidDiv.style.transform = \`translate(\${pan.x}px, \${pan.y}px) scale(\${zoom})\`;
                    zoomLevel.textContent = \`\${Math.round(zoom * 100)}%\`;
                }

                function handleWheel(e) {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    const rect = mermaidDiv.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;

                    const oldZoom = zoom;
                    zoom *= delta;
                    zoom = Math.min(Math.max(0.1, zoom), 5);

                    if (oldZoom !== zoom) {
                        const scale = zoom / oldZoom;
                        pan.x = mouseX - (mouseX - pan.x) * scale;
                        pan.y = mouseY - (mouseY - pan.y) * scale;
                        updateTransform();
                    }
                }

                mermaidDiv.addEventListener('mousedown', (e) => {
                    isDragging = true;
                    mermaidDiv.style.cursor = 'grabbing';
                    startPan = { x: pan.x, y: pan.y };
                    startPoint = { x: e.clientX, y: e.clientY };
                });

                window.addEventListener('mousemove', (e) => {
                    if (isDragging) {
                        pan.x = startPan.x + (e.clientX - startPoint.x);
                        pan.y = startPan.y + (e.clientY - startPoint.y);
                        updateTransform();
                    }
                });

                window.addEventListener('mouseup', () => {
                    isDragging = false;
                    mermaidDiv.style.cursor = 'grab';
                });

                container.addEventListener('wheel', handleWheel, { passive: false });

                document.getElementById('zoom-in').onclick = () => {
                    zoom *= 1.2;
                    zoom = Math.min(zoom, 5);
                    updateTransform();
                };

                document.getElementById('zoom-out').onclick = () => {
                    zoom *= 0.8;
                    zoom = Math.max(zoom, 0.1);
                    updateTransform();
                };

                document.getElementById('reset').onclick = () => {
                    zoom = 1;
                    pan = { x: 0, y: 0 };
                    updateTransform();
                };

                // Initial transform
                updateTransform();
            </script>
        </body>
        </html>`;
    }

    private generateMermaidDiagram(routes: Route[]): string {
        // Group routes by their base path segments
        const routeGroups = this.groupRoutesByPath(routes);

        let diagram = 'graph TD\n';
        diagram += '    root["/"];\n';

        // Add nodes and connections
        Object.entries(routeGroups).forEach(([path, pathRoutes]) => {
            if (path === '/') {
                return;
            }

            const segments = path.split('/').filter(Boolean);
            let currentPath = '';

            // Create nodes for each path segment
            segments.forEach((segment, index) => {
                const prevPath = currentPath;
                currentPath += '/' + segment;
                const nodeId = this.getNodeId(currentPath);
                const prevNodeId = prevPath ? this.getNodeId(prevPath) : 'root';

                diagram += `    ${nodeId}["${segment}"];\n`;
                diagram += `    ${prevNodeId} --> ${nodeId};\n`;
            });

            // Add method nodes as leaves
            pathRoutes.forEach(route => {
                const methodNodeId = this.getNodeId(route.path + '_' + route.method);
                const parentNodeId = this.getNodeId(route.path);
                diagram += `    ${methodNodeId}["${route.method}"];\n`;
                diagram += `    ${parentNodeId} --> ${methodNodeId};\n`;
            });
        });

        return diagram;
    }

    private groupRoutesByPath(routes: Route[]): Record<string, Route[]> {
        const groups: Record<string, Route[]> = { '/': [] };
        routes.forEach(route => {
            if (route.path in groups) {
                groups[route.path].push(route);
            } else {
                groups[route.path] = [route];
            }
        });
        return groups;
    }

    private getNodeId(path: string): string {
        return 'node' + Buffer.from(path).toString('hex');
    }

    public dispose() {
        RouteVisualizerPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}