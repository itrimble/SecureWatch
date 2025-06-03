'use client';

import React, { useState } from 'react';

const RuleEditor: React.FC = () => {
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [ruleDefinition, setRuleDefinition] = useState('');

  const sigmaPlaceholder = `title: New Admin User Added
status: experimental
description: Detects when a user is added to a high-privilege group.
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4728 # User added to security-enabled global group
    # OR EventID: 4732 # User added to security-enabled local group
    # OR EventID: 4756 # User added to security-enabled universal group
    TargetUserName: '*Administrator*' # Example, be more specific
  condition: selection
fields:
  - SubjectUserName
  - TargetUserName
  - TargetDomainName
falsepositives:
  - Legitimate administrative activity
level: high`;

  const handleSave = () => {
    console.log('Saving rule:', { ruleName, description, severity, ruleDefinition });
    // In a real app, this would submit the data
  };

  const handleCancel = () => {
    setRuleName('');
    setDescription('');
    setSeverity('Medium');
    setRuleDefinition('');
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl mt-6 md:mt-0">
      <h2 className="text-xl font-semibold text-gray-100 mb-4 border-b border-gray-700 pb-3">Create/Edit Detection Rule</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="ruleName" className="block text-sm font-medium text-gray-300 mb-1">Rule Name/Title</label>
          <input
            type="text"
            name="ruleName"
            id="ruleName"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
            placeholder="e.g., User Added to Administrators Group"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea
            name="description"
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
            placeholder="Briefly describe what this rule detects."
          ></textarea>
        </div>

        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-gray-300 mb-1">Severity</label>
          <select
            name="severity"
            id="severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as 'High' | 'Medium' | 'Low')}
            className="w-full bg-gray-700 border-gray-600 text-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5"
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div>
          <label htmlFor="ruleDefinition" className="block text-sm font-medium text-gray-300 mb-1">Rule Definition (Sigma-like)</label>
          <textarea
            name="ruleDefinition"
            id="ruleDefinition"
            rows={12}
            value={ruleDefinition}
            onChange={(e) => setRuleDefinition(e.target.value)}
            className="w-full bg-gray-900 border-gray-600 text-gray-100 font-mono text-sm rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-3"
            placeholder={sigmaPlaceholder}
          ></textarea>
          <p className="mt-1 text-xs text-gray-400">Enter rule logic using Sigma-like syntax or other supported format.</p>
        </div>

        <div className="flex justify-end space-x-3 pt-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-600 text-white font-medium text-sm rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition duration-150 ease-in-out"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition duration-150 ease-in-out"
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  );
};

export default RuleEditor;