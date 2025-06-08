import { NextRequest, NextResponse } from 'next/server';

interface FieldExtractionRule {
  id: string;
  name: string;
  description: string;
  regex: string;
  fieldName: string;
  fieldType: string;
  enabled: boolean;
  created: Date;
  modified: Date;
  category?: string;
  priority?: number;
}

// In-memory storage for demo - replace with database in production
let rules: FieldExtractionRule[] = [
  {
    id: '1',
    name: 'IP Address Extraction',
    description: 'Extract IP addresses from log messages',
    regex: '\\b(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\b',
    fieldName: 'ip_address',
    fieldType: 'ip',
    enabled: true,
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-01'),
    category: 'network',
    priority: 90
  },
  {
    id: '2',
    name: 'User ID Extraction',
    description: 'Extract user IDs from authentication logs',
    regex: 'user[_\\s]*[=:]\\s*([\\w\\.-]+)',
    fieldName: 'user_id',
    fieldType: 'string',
    enabled: true,
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-01'),
    category: 'authentication',
    priority: 85
  },
  {
    id: '3',
    name: 'HTTP Status Code',
    description: 'Extract HTTP status codes from web logs',
    regex: '\\s(\\d{3})\\s',
    fieldName: 'http_status',
    fieldType: 'number',
    enabled: true,
    created: new Date('2024-01-01'),
    modified: new Date('2024-01-01'),
    category: 'web',
    priority: 80
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const enabled = searchParams.get('enabled');

    let filteredRules = rules;

    if (category) {
      filteredRules = filteredRules.filter(rule => rule.category === category);
    }

    if (enabled !== null) {
      const isEnabled = enabled === 'true';
      filteredRules = filteredRules.filter(rule => rule.enabled === isEnabled);
    }

    return NextResponse.json({
      rules: filteredRules.sort((a, b) => (b.priority || 0) - (a.priority || 0)),
      total: filteredRules.length
    });
  } catch (error) {
    console.error('Error fetching field extraction rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, regex, fieldName, fieldType, category, priority = 50 } = body;

    if (!name || !regex || !fieldName || !fieldType) {
      return NextResponse.json(
        { error: 'Name, regex, fieldName, and fieldType are required' },
        { status: 400 }
      );
    }

    // Validate regex
    try {
      new RegExp(regex);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid regular expression' },
        { status: 400 }
      );
    }

    const newRule: FieldExtractionRule = {
      id: Date.now().toString(),
      name,
      description: description || `Extract ${fieldName} using regex`,
      regex,
      fieldName,
      fieldType,
      enabled: true,
      created: new Date(),
      modified: new Date(),
      category,
      priority
    };

    rules.push(newRule);

    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    console.error('Error creating field extraction rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);

    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Validate regex if provided
    if (body.regex) {
      try {
        new RegExp(body.regex);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid regular expression' },
          { status: 400 }
        );
      }
    }

    const updatedRule = {
      ...rules[ruleIndex],
      ...body,
      modified: new Date()
    };

    rules[ruleIndex] = updatedRule;

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Error updating field extraction rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json(
        { error: 'Rule ID is required' },
        { status: 400 }
      );
    }

    const ruleIndex = rules.findIndex(rule => rule.id === ruleId);

    if (ruleIndex === -1) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const deletedRule = rules.splice(ruleIndex, 1)[0];

    return NextResponse.json({ 
      message: 'Rule deleted successfully',
      deletedRule 
    });
  } catch (error) {
    console.error('Error deleting field extraction rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}