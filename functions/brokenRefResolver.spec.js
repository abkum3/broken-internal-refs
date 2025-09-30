/**
 * Copyright 2022 Cisco Systems, Inc. and its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  describe, expect, it,
} from '@jest/globals';
import { Spectral } from '@stoplight/spectral-core';
import brokenRefResolver from './brokenRefResolver.js';
import apiInsightsRuleset from '../api-insights-openapi-ruleset.js';

describe('brokenRefResolver', () => {
  const mockContext = {
    document: {
      data: {
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            },
            Organization: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                users: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          },
          responses: {
            NotFound: {
              description: 'Resource not found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        paths: {
          users: {
            get: {
              responses: {
                '200': {
                  $ref: '#/components/responses/NotFound'
                }
              }
            }
          }
        }
      }
    }
  };

  describe('valid internal references', () => {
    it('should return empty array for valid schema references', () => {
      const result = brokenRefResolver('#/components/schemas/User', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for valid response references', () => {
      const result = brokenRefResolver('#/components/responses/NotFound', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for nested path references', () => {
      const result = brokenRefResolver('#/paths/users/get', {}, mockContext);
      expect(result).toEqual([]);
    });
  });

  describe('broken internal references', () => {
    it('should return error message for non-existent schema', () => {
      const result = brokenRefResolver('#/components/schemas/NonExistent', {}, mockContext);
      expect(result).toEqual([
        {
          message: 'Broken reference: #/components/schemas/NonExistent'
        }
      ]);
    });

    it('should return error message for non-existent component type', () => {
      const result = brokenRefResolver('#/components/nonExistentType/Something', {}, mockContext);
      expect(result).toEqual([
        {
          message: 'Broken reference: #/components/nonExistentType/Something'
        }
      ]);
    });

    it('should return error message for deep non-existent path', () => {
      const result = brokenRefResolver('#/components/schemas/User/properties/nonExistentField', {}, mockContext);
      expect(result).toEqual([
        {
          message: 'Broken reference: #/components/schemas/User/properties/nonExistentField'
        }
      ]);
    });
  });

  describe('missing document cases', () => {
    it('should return empty array when no context is provided', () => {
      const result = brokenRefResolver('#/components/schemas/User', {}, {});
      expect(result).toEqual([]);
    });

    it('should return empty array when context.document.data is undefined', () => {
      const result = brokenRefResolver('#/components/schemas/User', {}, { document: {} });
      expect(result).toEqual([]);
    });

    it('should return empty array when context is null', () => {
      const result = brokenRefResolver('#/components/schemas/User', {}, null);
      expect(result).toEqual([]);
    });
  });

  describe('external references', () => {
    it('should return empty array for HTTP URLs', () => {
      const result = brokenRefResolver('http://example.com/schema.json', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for HTTPS URLs', () => {
      const result = brokenRefResolver('https://example.com/schema.json', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for file paths', () => {
      const result = brokenRefResolver('./schema.json', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for relative paths', () => {
      const result = brokenRefResolver('../schemas/user.json', {}, mockContext);
      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty fragment', () => {
      const result = brokenRefResolver('#/', {}, mockContext);
      expect(result).toEqual([
        {
          message: 'Broken reference: #/'
        }
      ]);
    });

    it('should return empty array for just hash symbol', () => {
      const result = brokenRefResolver('#', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = brokenRefResolver('', {}, mockContext);
      expect(result).toEqual([]);
    });

    it('should return empty array for null input', () => {
      const result = brokenRefResolver(null, {}, mockContext);
      expect(result).toEqual([]);
    });
  });

  describe('path traversal', () => {
    it('should handle null values in path', () => {
      const contextWithNull = {
        document: {
          data: {
            components: {
              schemas: {
                Test: null
              }
            }
          }
        }
      };
      const result = brokenRefResolver('#/components/schemas/Test/properties', {}, contextWithNull);
      expect(result).toEqual([
        {
          message: 'Broken reference: #/components/schemas/Test/properties'
        }
      ]);
    });

    it('should handle non-object values in path', () => {
      const contextWithPrimitive = {
        document: {
          data: {
            components: {
              schemas: {
                Test: 'string'
              }
            }
          }
        }
      };
      const result = brokenRefResolver('#/components/schemas/Test/properties', {}, contextWithPrimitive);
      expect(result).toEqual([
        {
          message: 'Broken reference: #/components/schemas/Test/properties'
        }
      ]);
    });
  });

  describe('integration with Spectral', () => {
    it('should work with Spectral instance', async () => {
      const spectral = new Spectral();
      
      // Test that the resolver can be used with Spectral
      // Note: This is a basic test since we removed the parserOptions from rulesets
      expect(typeof brokenRefResolver).toBe('function');
      expect(brokenRefResolver('#/test', {}, {})).toEqual([]);
      expect(brokenRefResolver('#/test', {}, { document: { data: {} } })).toEqual([
        {
          message: 'Broken reference: #/test'
        }
      ]);
    });

    it('should be compatible with Spectral resolver interface', () => {
      // Test the resolver signature
      const uri = '#/components/schemas/Test';
      const opts = {};
      const context = mockContext;
      
      expect(() => brokenRefResolver(uri, opts, context)).not.toThrow();
      
      // Test return types
      const validResult = brokenRefResolver('#/components/schemas/User', opts, context);
      const brokenResult = brokenRefResolver('#/components/schemas/NonExistent', opts, context);
      const externalResult = brokenRefResolver('http://example.com', opts, context);
      
      expect(Array.isArray(validResult)).toBe(true);
      expect(Array.isArray(brokenResult)).toBe(true);
      expect(Array.isArray(externalResult)).toBe(true);
    });
  });
});
