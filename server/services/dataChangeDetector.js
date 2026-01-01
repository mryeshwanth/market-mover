class DataChangeDetector {
    /**
     * Detects if there has been a significant change in data between current and previous capture.
     * @param {Object} currentCapture - Current captured prices { nifty, nasdaq, gold }
     * @param {Object} previousCapture - Previous captured prices { nifty, nasdaq, gold }
     * @returns {Object} - Flags indicating which assets changed { nifty_changed, nasdaq_changed, gold_changed }
     */
    detectChanges(currentCapture, previousCapture) {
        // If no previous capture exists, valid data is considered a "change" (initial state)
        if (!previousCapture) {
            return {
                nifty_changed: !!currentCapture.nifty,
                nasdaq_changed: !!currentCapture.nasdaq,
                gold_changed: !!currentCapture.gold
            };
        }

        const threshold = 0.01; // Minimum change to consider "changed"

        const hasChanged = (curr, prev) => {
            if (curr === null || curr === undefined || prev === null || prev === undefined) return false;
            return Math.abs(curr - prev) > threshold;
        };

        return {
            nifty_changed: hasChanged(currentCapture.nifty, previousCapture.nifty),
            nasdaq_changed: hasChanged(currentCapture.nasdaq, previousCapture.nasdaq),
            gold_changed: hasChanged(currentCapture.gold, previousCapture.gold)
        };
    }
}

module.exports = new DataChangeDetector();
