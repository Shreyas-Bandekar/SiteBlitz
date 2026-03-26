/**
 * SiteBlitz Embed Engine v1.0 
 * Drop-in modular components without style leakage.
 */

(function() {
    'use strict';

    class SiteBlitzEmbed extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        async connectedCallback() {
            const section = this.getAttribute('section') || 'hero';
            const theme = this.getAttribute('theme') || 'dark';
            
            // Render basic structure
            this.shadowRoot.innerHTML = `
                <style>
                    :host { display: block; width: 100%; border-radius: 2rem; overflow: hidden; margin-bottom: 2rem; }
                    .loading { height: 400px; display: flex; items-center: center; justify-content: center; background: #020617; border-radius: 2rem; font-family: sans-serif; color: #94a3b8; }
                </style>
                <div class="loading">Loading SiteBlitz ${section}...</div>
            `;

            // Simulate fetching component (could be a real API call or static template)
            setTimeout(() => this.render(section, theme), 800);
        }

        render(section, theme) {
            const tailwindCDN = '<script src="https://cdn.tailwindcss.com"></script>';
            const lucideCDN = '<script src="https://unpkg.com/lucide@latest"></script>';
            const fonts = '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">';
            
            let content = '';
            
            if (section === 'hero') {
                content = `
                    <section class="p-12 md:p-24 bg-slate-950 text-white rounded-[3rem] border border-slate-800 relative overflow-hidden text-center">
                        <div class="absolute inset-0 bg-cyan-500/5 blur-[120px] rounded-full"></div>
                        <h1 class="text-4xl md:text-6xl font-black mb-8 leading-tight relative z-10">Blitz Your Site to <br> <span class="text-cyan-400">Perfection</span></h1>
                        <p class="text-slate-400 mb-12 max-w-2xl mx-auto relative z-10 text-lg">The high-precision audit engine for SMBs. 50+ data points in under 30 seconds.</p>
                        <form class="flex flex-col sm:flex-row p-2 rounded-2xl bg-slate-900/50 border border-slate-700 relative z-10 max-w-xl mx-auto backdrop-blur-md">
                            <input type="url" required placeholder="https://yourwebsite.com" class="bg-transparent border-none outline-none py-3 px-4 flex-1 text-white">
                            <button type="submit" class="bg-cyan-500 text-slate-950 px-8 py-3 rounded-xl font-bold hover:bg-cyan-400 transition-colors">Analyze</button>
                        </form>
                    </section>
                `;
            } else if (section === 'features') {
                content = `
                    <section class="p-12 md:p-24 bg-slate-900 text-white rounded-[3rem] border border-slate-800">
                        <h2 class="text-3xl font-black mb-12">Blitz Features</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                            <div class="p-8 rounded-2xl bg-slate-950 border border-slate-800">
                                <h3 class="font-bold text-cyan-400 mb-2">Mobile-First</h3>
                                <p class="text-slate-400 text-sm">Real device emulation for 100% accurate responsive scoring.</p>
                            </div>
                            <div class="p-8 rounded-2xl bg-slate-950 border border-slate-800">
                                <h3 class="font-bold text-cyan-400 mb-2">Gemini AI</h3>
                                <p class="text-slate-400 text-sm">Contextual fixes prioritized by ROI impact.</p>
                            </div>
                        </div>
                    </section>
                `;
            }

            this.shadowRoot.innerHTML = `
                ${fonts}
                <div class="siteblitz-container ${theme}-theme">
                    <!-- Tailwind reset / subset -->
                    <style>
                        .siteblitz-container { font-family: 'Inter', sans-serif; line-height: 1.5; color: #f8fafc; }
                        input:focus { outline: none; }
                        button { cursor: pointer; }
                        @import url('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');
                    </style>
                    <div class="tw-scope">
                        ${content}
                    </div>
                </div>
            `;
            
            // Handle form submission inside shadow root
            const form = this.shadowRoot.querySelector('form');
            if (form) {
                form.onsubmit = (e) => {
                    e.preventDefault();
                    const url = form.querySelector('input').value;
                    window.location.href = \`/audit?url=\${encodeURIComponent(url)}&autoStart=1\`;
                };
            }
        }
    }

    // Register web component
    if (!customElements.get('siteblitz-embed')) {
        customElements.define('siteblitz-embed', SiteBlitzEmbed);
    }
})();
