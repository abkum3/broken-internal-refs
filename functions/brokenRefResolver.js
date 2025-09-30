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

'use strict';

/**
 * Custom Spectral function to validate $ref references and handle broken ones gracefully
 * @param {string} input - The $ref value to validate
 * @param {Object} options - Function options
 * @param {Object} context - Spectral context with document and path info
 * @returns {Array} Array of validation results (empty if valid, messages if invalid)
 */
export default function brokenRefResolver(input, options, context) {
  // Only process internal references (starting with #/)
  if (!input || typeof input !== 'string' || !input.startsWith('#/')) {
    return [];
  }

  // Handle missing or invalid context
  if (!context || !context.document || !context.document.data) {
    return [];
  }

  // Parse the reference path
  const path = input.substring(2).split('/');
  
  // Try to resolve the reference in the document
  let current = context.document.data;
  
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in current) {
      current = current[segment];
    } else {
      // Broken reference found
      return [
        {
          message: `Broken reference: ${input}`,
        },
      ];
    }
  }
  
  // Reference is valid
  return [];
}
