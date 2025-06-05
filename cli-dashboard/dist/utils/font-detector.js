"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontDetector = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class FontDetector {
    nerdFontsDetected = null;
    detectedFonts = [];
    constructor() {
        this.detectNerdFonts();
    }
    /**
     * Check if Nerd Fonts are available in the system
     */
    hasNerdFonts() {
        if (this.nerdFontsDetected === null) {
            this.detectNerdFonts();
        }
        return this.nerdFontsDetected || false;
    }
    /**
     * Get list of detected fonts
     */
    getDetectedFonts() {
        return this.detectedFonts;
    }
    /**
     * Get font recommendations for optimal experience
     */
    getFontRecommendations() {
        return [
            'Meslo LGS NF (Recommended)',
            'FiraCode Nerd Font',
            'JetBrainsMono Nerd Font',
            'Hack Nerd Font',
            'Source Code Pro Nerd Font',
            'DejaVu Sans Mono Nerd Font'
        ];
    }
    /**
     * Get installation instructions for the current platform
     */
    getInstallationInstructions() {
        const platform = os.platform();
        switch (platform) {
            case 'darwin': // macOS
                return `
{bold}macOS Installation:{/bold}
1. Install via Homebrew (Recommended):
   brew tap homebrew/cask-fonts
   brew install font-meslo-lg-nerd-font

2. Manual Installation:
   • Download from: https://github.com/ryanoasis/nerd-fonts/releases
   • Double-click .ttf files to install
   • Restart terminal and configure font

3. Configure Terminal:
   • Terminal.app: Preferences > Profiles > Font
   • iTerm2: Preferences > Profiles > Text > Font
   • Choose "Meslo LGS NF" or any Nerd Font variant
`;
            case 'linux':
                return `
{bold}Linux Installation:{/bold}
1. Download fonts:
   wget https://github.com/ryanoasis/nerd-fonts/releases/download/v3.0.2/Meslo.zip
   unzip Meslo.zip -d ~/.local/share/fonts/
   fc-cache -fv

2. Package manager (Ubuntu/Debian):
   sudo apt install fonts-firacode
   
3. Configure terminal to use Nerd Font variant

4. Verify installation:
   fc-list | grep -i nerd
`;
            case 'win32': // Windows
                return `
{bold}Windows Installation:{/bold}
1. Download from: https://github.com/ryanoasis/nerd-fonts/releases
2. Extract and right-click .ttf files > Install
3. Configure terminal:
   • Windows Terminal: Settings > Profiles > Appearance > Font face
   • PowerShell: Properties > Font
   • Choose "Meslo LGS NF" or any Nerd Font

4. Enable Unicode support in terminal
`;
            default:
                return `
{bold}General Installation:{/bold}
1. Download Nerd Fonts from: https://github.com/ryanoasis/nerd-fonts
2. Install font files according to your system
3. Configure terminal to use the font
4. Restart terminal application
`;
        }
    }
    /**
     * Test if the terminal supports Unicode characters
     */
    testUnicodeSupport() {
        // Test basic Unicode support
        try {
            process.stdout.write('\u2713'); // Check mark
            process.stdout.write('\u2717'); // X mark
            process.stdout.write('\u25CF'); // Filled circle
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get terminal environment information
     */
    getTerminalInfo() {
        return {
            TERM: process.env.TERM || 'unknown',
            TERM_PROGRAM: process.env.TERM_PROGRAM || 'unknown',
            COLORTERM: process.env.COLORTERM || 'unknown',
            LC_ALL: process.env.LC_ALL || 'unknown',
            LANG: process.env.LANG || 'unknown',
            supportsColor: process.stdout.isTTY && process.stdout.hasColors?.(),
            columns: process.stdout.columns || 80,
            rows: process.stdout.rows || 24
        };
    }
    /**
     * Generate a comprehensive font status report
     */
    generateFontReport() {
        const terminalInfo = this.getTerminalInfo();
        const hasNerd = this.hasNerdFonts();
        const unicodeSupport = this.testUnicodeSupport();
        return `
{center}{bold}Font & Terminal Capability Report{/bold}{/center}

{bold}Font Detection:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Nerd Fonts: ${hasNerd ? '{green-fg}✓ Detected{/}' : '{red-fg}✗ Not Found{/}'}
• Unicode Support: ${unicodeSupport ? '{green-fg}✓ Available{/}' : '{red-fg}✗ Limited{/}'}
${this.detectedFonts.length > 0 ? '• Detected Fonts: ' + this.detectedFonts.join(', ') : '• No specific Nerd Fonts detected'}

{bold}Terminal Environment:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Terminal: ${terminalInfo.TERM_PROGRAM} (${terminalInfo.TERM})
• Color Support: ${terminalInfo.supportsColor ? '{green-fg}✓ Yes{/}' : '{red-fg}✗ No{/}'}
• Resolution: ${terminalInfo.columns}x${terminalInfo.rows}
• Locale: ${terminalInfo.LANG}

{bold}Current Experience:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${hasNerd ?
            '• {green-fg}Enhanced Visual Experience{/} with rich icons and symbols' :
            '• {yellow-fg}Standard Experience{/} with ASCII fallback characters'}
• Dashboard optimized for ${terminalInfo.columns >= 120 ? 'large' : 'standard'} display
• All features ${hasNerd ? 'fully' : 'functionally'} available

{bold}Improvement Recommendations:{/bold}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${hasNerd ?
            '✓ Your setup is optimal for the best SecureWatch CLI experience!' :
            `• Install Nerd Fonts for enhanced visual experience
• Recommended: Meslo LGS NF, FiraCode NF, or JetBrainsMono NF
• Increase terminal size to 120+ columns for optimal layout`}

${this.getInstallationInstructions()}

Press any key to close...
`;
    }
    detectNerdFonts() {
        try {
            // Multiple detection strategies
            this.nerdFontsDetected =
                this.detectFromEnvironment() ||
                    this.detectFromFontDirectories() ||
                    this.detectFromTerminalFeatures();
        }
        catch (error) {
            console.debug('Font detection error:', error);
            this.nerdFontsDetected = false;
        }
    }
    detectFromEnvironment() {
        // Check environment variables that might indicate Nerd Font usage
        const termProgram = process.env.TERM_PROGRAM?.toLowerCase() || '';
        const terminalFont = process.env.TERMINAL_FONT?.toLowerCase() || '';
        // Common Nerd Font indicators
        const nerdFontIndicators = [
            'nerd', 'meslo', 'firacode', 'jetbrains', 'hack', 'source code pro',
            'dejavusansmono', 'robotomono', 'inconsolata', 'ubuntu mono'
        ];
        return nerdFontIndicators.some(indicator => termProgram.includes(indicator) || terminalFont.includes(indicator));
    }
    detectFromFontDirectories() {
        const platform = os.platform();
        let fontDirs = [];
        switch (platform) {
            case 'darwin': // macOS
                fontDirs = [
                    '/Library/Fonts',
                    '/System/Library/Fonts',
                    path.join(os.homedir(), 'Library/Fonts')
                ];
                break;
            case 'linux':
                fontDirs = [
                    '/usr/share/fonts',
                    '/usr/local/share/fonts',
                    path.join(os.homedir(), '.local/share/fonts'),
                    path.join(os.homedir(), '.fonts')
                ];
                break;
            case 'win32':
                fontDirs = [
                    'C:\\Windows\\Fonts',
                    path.join(os.homedir(), 'AppData/Local/Microsoft/Windows/Fonts')
                ];
                break;
        }
        for (const fontDir of fontDirs) {
            if (this.scanFontDirectory(fontDir)) {
                return true;
            }
        }
        return false;
    }
    scanFontDirectory(fontDir) {
        try {
            if (!fs.existsSync(fontDir))
                return false;
            const files = fs.readdirSync(fontDir);
            const nerdFontFiles = files.filter(file => {
                const fileName = file.toLowerCase();
                return fileName.includes('nerd') ||
                    fileName.includes('meslo') ||
                    fileName.includes('firacode') ||
                    fileName.includes('jetbrains') ||
                    (fileName.includes('nf') && fileName.includes('.ttf'));
            });
            if (nerdFontFiles.length > 0) {
                this.detectedFonts = nerdFontFiles.slice(0, 5); // Store up to 5 detected fonts
                return true;
            }
        }
        catch (error) {
            // Silent fail for permission errors
        }
        return false;
    }
    detectFromTerminalFeatures() {
        // Test if terminal can render Nerd Font specific characters
        const termInfo = this.getTerminalInfo();
        // Advanced terminals with good Unicode support often support Nerd Fonts
        const advancedTerminals = ['iterm2', 'alacritty', 'kitty', 'wezterm', 'windows terminal'];
        const termProgram = (termInfo.TERM_PROGRAM || '').toLowerCase();
        if (advancedTerminals.some(term => termProgram.includes(term))) {
            return true;
        }
        // Check if terminal supports 256 colors (often correlates with font support)
        if (termInfo.COLORTERM === 'truecolor' || termInfo.TERM?.includes('256')) {
            return true;
        }
        return false;
    }
    /**
     * Quick font test - displays sample characters
     */
    displayFontTest() {
        const nerdChars = [
            { char: '', desc: 'File icon' },
            { char: '', desc: 'Folder icon' },
            { char: '', desc: 'Git branch' },
            { char: '', desc: 'Database' },
            { char: '', desc: 'Settings' },
            { char: '', desc: 'Network' },
            { char: '', desc: 'Warning' },
            { char: '', desc: 'Success' }
        ];
        const fallbackChars = [
            { char: '📄', desc: 'File icon' },
            { char: '📁', desc: 'Folder icon' },
            { char: '🌿', desc: 'Git branch' },
            { char: '🗄️', desc: 'Database' },
            { char: '⚙️', desc: 'Settings' },
            { char: '🌐', desc: 'Network' },
            { char: '⚠️', desc: 'Warning' },
            { char: '✅', desc: 'Success' }
        ];
        const chars = this.hasNerdFonts() ? nerdChars : fallbackChars;
        const fontType = this.hasNerdFonts() ? 'Nerd Font' : 'Unicode Fallback';
        let result = `\n{center}{bold}Font Capability Test (${fontType}){/bold}{/center}\n\n`;
        chars.forEach(item => {
            result += `${item.char}  ${item.desc}\n`;
        });
        result += `\n{center}${this.hasNerdFonts() ?
            '{green-fg}✓ Enhanced icons displayed properly{/}' :
            '{yellow-fg}! Using Unicode fallback characters{/}'}{/center}`;
        return result;
    }
    getFontInfo() {
        const hasNerdFonts = this.hasNerdFonts();
        return `Font Status: ${hasNerdFonts ? 'Enhanced (Nerd Fonts detected)' : 'Standard (Fallback mode)'}\n` +
            `Detected fonts: ${this.detectedFonts.length > 0 ? this.detectedFonts.join(', ') : 'None'}\n` +
            `For enhanced experience, install Meslo LGS NF or similar Nerd Font.`;
    }
}
exports.FontDetector = FontDetector;
//# sourceMappingURL=font-detector.js.map