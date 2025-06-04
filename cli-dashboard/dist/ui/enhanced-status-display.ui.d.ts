import { DashboardData } from '../types';
/**
 * Enhanced status display implementation matching user requirements
 * Provides comprehensive, actionable infrastructure status representation
 */
export declare class EnhancedStatusDisplayUI {
    private screen;
    private container;
    private currentData;
    constructor();
    private setupLayout;
    private setupKeyBindings;
    /**
     * Update display with new data
     */
    update(data: DashboardData): void;
    /**
     * Render the enhanced status display
     */
    render(): void;
    /**
     * Generate enhanced status content matching user requirements
     */
    private generateEnhancedStatusContent;
    /**
     * Generate example status display as shown in user requirements
     */
    static generateExampleDisplay(): string;
    destroy(): void;
}
//# sourceMappingURL=enhanced-status-display.ui.d.ts.map