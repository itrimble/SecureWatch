export declare class FontDetector {
    private nerdFontsDetected;
    private detectedFonts;
    constructor();
    /**
     * Check if Nerd Fonts are available in the system
     */
    hasNerdFonts(): boolean;
    /**
     * Get list of detected fonts
     */
    getDetectedFonts(): string[];
    /**
     * Get font recommendations for optimal experience
     */
    getFontRecommendations(): string[];
    /**
     * Get installation instructions for the current platform
     */
    getInstallationInstructions(): string;
    /**
     * Test if the terminal supports Unicode characters
     */
    testUnicodeSupport(): boolean;
    /**
     * Get terminal environment information
     */
    getTerminalInfo(): any;
    /**
     * Generate a comprehensive font status report
     */
    generateFontReport(): string;
    private detectNerdFonts;
    private detectFromEnvironment;
    private detectFromFontDirectories;
    private scanFontDirectory;
    private detectFromTerminalFeatures;
    /**
     * Quick font test - displays sample characters
     */
    displayFontTest(): string;
    getFontInfo(): string;
}
//# sourceMappingURL=font-detector.d.ts.map