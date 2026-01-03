/**
 * Async Helpers - Utilities for async/await patterns
 * Provides timeout and error handling for async operations
 */

import { ErrorHandler } from './error-handler.js';
import { Logger } from './logger.js';

/**
 * Wrap a promise with a timeout
 * @param {Promise} promise - Promise to wrap
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} errorMessage - Error message if timeout occurs
 * @returns {Promise} Promise that rejects on timeout
 */
export async function withTimeout(promise, timeoutMs, errorMessage = 'Operation timed out') {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`${errorMessage} (${timeoutMs}ms)`));
        }, timeoutMs);
    });
    
    return Promise.race([promise, timeout]);
}

/**
 * Retry an async operation with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise} Result of the operation
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 100) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt);
                Logger.warn('AsyncHelpers', `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError;
}

/**
 * Execute async operations in parallel with error handling
 * @param {Array<Function>} operations - Array of async functions
 * @param {boolean} failFast - If true, stop on first error
 * @returns {Promise<Array>} Array of results
 */
export async function parallel(operations, failFast = false) {
    const promises = operations.map((op, index) => {
        return op().catch(error => {
            ErrorHandler.handle(error, `AsyncHelpers.parallel[${index}]`, 'error');
            if (failFast) {
                throw error;
            }
            return null;
        });
    });
    
    return Promise.all(promises);
}

