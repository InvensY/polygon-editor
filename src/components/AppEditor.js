import './CanvasView.js'
import './InfoPanel.js'
import './ToolPanel.js'


export class AppEditor extends HTMLElement {
    constructor(){
        super();
        this.attachShadow({mode: 'open'})
    }

    connectedCallback(){
        this.shadowRoot.innerHTML = `
        <style>
             * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                overflow:hidden
            }
            
            :host {
                display: block;
                width: 100%;
                height: 100%;
                min-height: 100vh;
            }
            
            .app {
                max-width: 1600px;
                margin: 0 auto;
                padding: 24px;
                height: 100vh;
                display: flex;
                flex-direction: column;
                background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 50%, #ddd6fe 100%);
                position: relative;
                overflow-y: auto;
            }
            
            .app::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%);
                pointer-events: none;
            }
            
            .header {
                margin-bottom: 24px;
                animation: slideDown 0.6s ease-out;
            }
            
            .title {
                font-size: clamp(20px, 5vw, 28px);
                font-weight: 700;
                background: linear-gradient(135deg, #4f46e5, #7c3aed);
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                display: inline-block;
                animation: glow 2s ease-in-out infinite;
            }
            
            .subtitle {
                color: #6b7280;
                font-size: clamp(12px, 3vw, 14px);
                margin-top: 4px;
            }
            
            .main {
                display: flex;
                flex: 1;
                gap: 24px;
                min-height: 0;
            }
            
            canvas-view {
                flex: 1;
                background: #ffffff;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15);
                border: 1px solid rgba(79, 70, 229, 0.2);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                animation: fadeInUp 0.5s ease-out;
                margin-top:5px;
            }
            
            canvas-view:hover {
                transform: translateY(-4px);
                box-shadow: 0 25px 50px -12px rgba(79, 70, 229, 0.25);
                border-color: rgba(79, 70, 229, 0.4);
            }
            
            .sidebar {
                width: 320px;
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes glow {
                0%, 100% {
                    text-shadow: 0 0 0px rgba(79, 70, 229, 0);
                }
                50% {
                    text-shadow: 0 0 20px rgba(79, 70, 229, 0.3);
                }
            }
            
            .sidebar > * {
                animation: fadeInRight 0.5s ease-out backwards;
            }
            
            .sidebar > *:nth-child(1) { animation-delay: 0.1s; }
            .sidebar > *:nth-child(2) { animation-delay: 0.2s; }
            
            @keyframes fadeInRight {
                from {
                    opacity: 0;
                    transform: translateX(30px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @media (max-width: 1024px) {
                .app {
                    padding: 20px;
                }
                .main {
                    gap: 20px;
                }
                .sidebar {
                    width: 280px;
                }
            }
            
            @media (max-width: 900px) {
                .app {
                    padding: 16px;
                    height: auto;
                    min-height: 100vh;
                }
                .main {
                    flex-direction: column;
                }
                .sidebar {
                    width: 100%;
                }
                canvas-view {
                    min-height: 400px;
                }
            }
            
            @media (max-width: 640px) {
                .app {
                    padding: 12px;
                }
                .header {
                    margin-bottom: 16px;
                }
                .main {
                    gap: 16px;
                }
            }
        </style>
        <div class="container">
            <tool-panel></tool-panel>
            <div class="main">
                <canvas-view></canvas-view>
                <div class="sidebar">
                    <info-panel></info-panel>
                </div>
            </div>
        </div>
    `;
  }
}

customElements.define('app-editor', AppEditor);
