/**
 * Logger - Structured logging system with log levels
 * Provides consistent logging with context and environment-based filtering
 */

export class Logger {
    static LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    };
    
    static level = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') 
        ? Logger.LEVELS.WARN 
        : Logger.LEVELS.DEBUG;

    // In-memory log storage for in-game viewer
    static logHistory = [];
    static maxLogHistory = 500; // Keep last 500 log entries
    
    /**
     * Set the log level
     * @param {number} level - Log level from Logger.LEVELS
     */
    static setLevel(level) {
        Logger.level = level;
    }
    
    /**
     * Log debug message
     * @param {string} context - Context where log originated (e.g., 'CombatManager')
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    static debug(context, message, data = null) {
        if (Logger.level <= Logger.LEVELS.DEBUG) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level: 'DEBUG',
                context,
                message,
                data: data !== null ? JSON.stringify(data) : null
            };
            Logger.addToHistory(logEntry);
            if (data !== null) {
                console.log(`[${timestamp}][DEBUG][${context}]`, message, data);
            } else {
                console.log(`[${timestamp}][DEBUG][${context}]`, message);
            }
        }
    }
    
    /**
     * Log info message
     * @param {string} context - Context where log originated
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    static info(context, message, data = null) {
        if (Logger.level <= Logger.LEVELS.INFO) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level: 'INFO',
                context,
                message,
                data: data !== null ? JSON.stringify(data) : null
            };
            Logger.addToHistory(logEntry);
            if (data !== null) {
                console.log(`[${timestamp}][INFO][${context}]`, message, data);
            } else {
                console.log(`[${timestamp}][INFO][${context}]`, message);
            }
        }
    }
    
    /**
     * Log warning message
     * @param {string} context - Context where log originated
     * @param {string} message - Log message
     * @param {*} data - Optional data to log
     */
    static warn(context, message, data = null) {
        if (Logger.level <= Logger.LEVELS.WARN) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level: 'WARN',
                context,
                message,
                data: data !== null ? JSON.stringify(data) : null
            };
            Logger.addToHistory(logEntry);
            if (data !== null) {
                console.warn(`[${timestamp}][WARN][${context}]`, message, data);
            } else {
                console.warn(`[${timestamp}][WARN][${context}]`, message);
            }
        }
    }
    
    /**
     * Log error message
     * @param {string} context - Context where log originated
     * @param {string} message - Log message
     * @param {Error} error - Optional error object
     */
    static error(context, message, error = null) {
        if (Logger.level <= Logger.LEVELS.ERROR) {
            const timestamp = new Date().toISOString();
            const errorData = error ? (error.stack || error.toString()) : null;
            const logEntry = {
                timestamp,
                level: 'ERROR',
                context,
                message,
                data: errorData
            };
            Logger.addToHistory(logEntry);
            if (error) {
                console.error(`[${timestamp}][ERROR][${context}]`, message, error);
            } else {
                console.error(`[${timestamp}][ERROR][${context}]`, message);
            }
        }
    }

    /**
     * Add log entry to history
     * @param {Object} logEntry - Log entry object
     */
    static addToHistory(logEntry) {
        Logger.logHistory.push(logEntry);
        // Keep only last maxLogHistory entries
        if (Logger.logHistory.length > Logger.maxLogHistory) {
            Logger.logHistory.shift();
        }
    }

    /**
     * Get recent log entries
     * @param {number} count - Number of entries to retrieve (default: all)
     * @param {string} level - Filter by log level (optional)
     * @returns {Array} Array of log entries
     */
    static getLogs(count = null, level = null) {
        let logs = Logger.logHistory;
        
        // Filter by level if specified
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        
        // Return last N entries if count specified
        if (count && count > 0) {
            return logs.slice(-count);
        }
        
        return logs;
    }

    /**
     * Clear log history
     */
    static clearLogs() {
        Logger.logHistory = [];
    }

    /**
     * Get log statistics
     * @returns {Object} Log statistics
     */
    static getLogStats() {
        const stats = {
            total: Logger.logHistory.length,
            debug: 0,
            info: 0,
            warn: 0,
            error: 0
        };
        
        Logger.logHistory.forEach(log => {
            if (stats[log.level.toLowerCase()] !== undefined) {
                stats[log.level.toLowerCase()]++;
            }
        });
        
        return stats;
    }
}

