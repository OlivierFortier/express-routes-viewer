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

    private getWebviewContent(routes: Route[]): string {
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
                    theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
                    themeVariables: {
                        darkMode: document.body.classList.contains('vscode-dark'),
                        primaryColor: '#42A5F5',
                        primaryBorderColor: '#1E88E5',
                        primaryTextColor: '#fff',
                        secondaryColor: '#78909C',
                        secondaryBorderColor: '#455A64',
                        secondaryTextColor: '#fff',
                        tertiaryColor: '#90A4AE',
                        tertiaryBorderColor: '#546E7A',
                        tertiaryTextColor: '#fff'
                    }
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
        const diagram = 'graph LR\n' +
            '    %% Method color definitions\n' +
            '    classDef get fill:#4CAF50,stroke:#2E7D32,color:#fff;\n' +
            '    classDef httpget fill:#4CAF50,stroke:#2E7D32,color:#fff;\n' +
            '    classDef post fill:#2196F3,stroke:#1565C0,color:#fff;\n' +
            '    classDef httppost fill:#2196F3,stroke:#1565C0,color:#fff;\n' +
            '    classDef put fill:#FF9800,stroke:#EF6C00,color:#fff;\n' +
            '    classDef httpput fill:#FF9800,stroke:#EF6C00,color:#fff;\n' +
            '    classDef delete fill:#F44336,stroke:#C62828,color:#fff;\n' +
            '    classDef httpdelete fill:#F44336,stroke:#C62828,color:#fff;\n' +
            '    classDef patch fill:#9C27B0,stroke:#6A1B9A,color:#fff;\n' +
            '    classDef httppatch fill:#9C27B0,stroke:#6A1B9A,color:#fff;\n' +
            '    classDef options fill:#607D8B,stroke:#37474F,color:#fff;\n' +
            '    classDef httpoptions fill:#607D8B,stroke:#37474F,color:#fff;\n' +
            '    classDef head fill:#795548,stroke:#3E2723,color:#fff;\n' +
            '    classDef httphead fill:#795548,stroke:#3E2723,color:#fff;\n' +
            '    classDef file fill:#546E7A,stroke:#263238,color:#fff;\n' + // Add file node style
            '    classDef default fill:#78909C,stroke:#37474F,color:#fff;\n\n';

        let nodes = '    root["/"];\n\n';
        const routeGroups = this.groupRoutesByPath(routes);
        const fileGroups = this.groupRoutesByFile(routes);

        // Create file nodes first
        Object.entries(fileGroups).forEach(([filePath, fileRoutes]) => {
            const fileNodeId = this.getNodeId(`file_${filePath}`);
            const fileName = filePath.split('/').pop() || filePath;
            nodes += `    ${fileNodeId}["${fileName}"];\n`;
            nodes += `    root --> ${fileNodeId};\n`;
            nodes += `    class ${fileNodeId} file;\n\n`;

            // Add routes for this file
            fileRoutes.forEach(route => {
                const routeNodeId = this.getNodeId(`route_${filePath}_${route.method}_${route.path}`);
                nodes += `    ${routeNodeId}["${route.method} ${route.path}"];\n`;
                nodes += `    ${fileNodeId} --> ${routeNodeId};\n`;
                nodes += `    class ${routeNodeId} ${route.method.toLowerCase()};\n`;
            });
            nodes += '\n';
        });

        return diagram + nodes;
    }

    private groupRoutesByPath(routes: Route[]): Record<string, Route[]> {
        const groups: Record<string, Route[]> = {};

        routes.forEach(route => {
            const normalizedPath = route.path === '/' ? '/' : route.path.replace(/\/+$/, '');
            if (!groups[normalizedPath]) {
                groups[normalizedPath] = [];
            }
            groups[normalizedPath].push(route);
        });

        return groups;
    }

    private groupRoutesByFile(routes: Route[]): Record<string, Route[]> {
        const groups: Record<string, Route[]> = {};
        routes.forEach(route => {
            if (!groups[route.filePath]) {
                groups[route.filePath] = [];
            }
            groups[route.filePath].push(route);
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