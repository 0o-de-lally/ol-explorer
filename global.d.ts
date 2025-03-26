import '@testing-library/jest-native/extend-expect';

// This ensures TypeScript knows about the expected extensions from jest-native
declare global {
  namespace jest {
    interface Matchers<R> {
      // Jest-native matchers
      toBeDisabled(): R;
      toBeEnabled(): R;
      toBeEmpty(): R;
      toContainElement(element: React.ReactTestInstance | null): R;
      toHaveProp(prop: string, value?: any): R;
      toHaveTextContent(text: string | RegExp, options?: { normalizeWhitespace: boolean }): R;
      toBeVisible(): R;
      
      // Jest matchers
      toBe(expected: any): R;
      toBeTruthy(): R;
      toBeDefined(): R;
      toBeFalsy(): R;
      toBeNull(): R;
      toBeUndefined(): R;
      toEqual(expected: any): R;
      toMatch(expected: string | RegExp): R;
      toContain(expected: any): R;
      toHaveLength(expected: number): R;
      
      // Mock function matchers
      toHaveBeenCalled(): R;
      toHaveBeenCalledTimes(expected: number): R;
      toHaveBeenCalledWith(...args: any[]): R;
      toHaveBeenLastCalledWith(...args: any[]): R;
      toHaveBeenNthCalledWith(nth: number, ...args: any[]): R;
      toHaveReturned(): R;
      toHaveReturnedTimes(expected: number): R;
      toHaveReturnedWith(expected: any): R;
      toHaveLastReturnedWith(expected: any): R;
      toHaveNthReturnedWith(nth: number, expected: any): R;
    }
  }
} 