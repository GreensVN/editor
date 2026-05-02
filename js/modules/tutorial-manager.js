/**
 * tutorial-manager.js
 * Tutorial — onboarding steps
 * ProCode IDE v3.0
 */

// ============================================
// TUTORIAL MANAGER
// ============================================
const Tutorial = {
    start: function() {
        Console.clear();
        Console.info(' Starting ProCode IDE Tutorial');
        Console.info('='.repeat(50));
        
        const steps = [
            {
                title: 'Welcome to ProCode IDE',
                content: 'This is a full-featured web development environment built with modern web technologies.',
                action: () => {
                    Utils.toast('Welcome!', 'info');
                }
            },
            {
                title: 'File Explorer',
                content: 'Use the file explorer on the left to navigate your project files.',
                action: () => {
                    LayoutManager.setSide('expl');
                }
            },
            {
                title: 'Editor',
                content: 'The editor supports syntax highlighting, auto-completion, and multiple cursors.',
                action: () => {
                    const editor = EditorManager.getCurrentEditor();
                    if (editor) editor.focus();
                }
            },
            {
                title: 'Terminal',
                content: 'Access the integrated terminal with support for commands and package management.',
                action: () => {
                    LayoutManager.toggleLayout('terminal', true);
                }
            },
            {
                title: 'Preview',
                content: 'See live previews of your web applications with hot reload.',
                action: () => {
                    LayoutManager.toggleLayout('preview', true);
                }
            },
            {
                title: 'AI Assistant',
                content: 'Get coding help from the AI assistant for debugging and code generation.',
                action: () => {
                    AI.toggle();
                }
            }
        ];
        
        let currentStep = 0;
        
        const showStep = (index) => {
            if (index >= steps.length) {
                Console.info(' Tutorial completed!');
                Utils.toast('Tutorial completed!', 'success');
                return;
            }
            
            const step = steps[index];
            Console.info(` Step ${index + 1}: ${step.title}`);
            Console.info(step.content);
            Console.info('---');
            
            step.action();
            
            if (index < steps.length - 1) {
                setTimeout(() => showStep(index + 1), 2000);
            }
        };
        
        showStep(currentStep);
    }
};