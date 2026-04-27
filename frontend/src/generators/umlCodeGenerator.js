function extractClasses(elements) {
  return elements.filter((element) => element.type === 'class');
}

function parseClassText(text) {
  const rawLines = String(text || '').split('\n');
  const lines = rawLines.map((line) => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    return { className: '', attributes: [], methods: [] };
  }

  const className = lines[0];
  const attributes = [];
  const methods = [];
  
  lines.slice(1).forEach(line => {
    if (line.endsWith(')')) {
      methods.push(line);
    } else {
      attributes.push(line);
    }
  });

  return { className, attributes, methods };
}

function buildInheritanceMap(connectors) {
  const inheritanceMap = new Map();

  connectors
    .filter((connector) => connector.type === 'inheritance')
    .forEach((connector) => {
      const childId = connector.fromElement;
      const parentId = connector.toElement;

      if (childId && parentId && !inheritanceMap.has(childId)) {
        inheritanceMap.set(childId, parentId);
      }
    });

  return inheritanceMap;
}

function generateClassCode(className, attributes, methods, parent) {
  const classHeader = parent ? `class ${className}(${parent}):` : `class ${className}:`;

  let body = '';

  if (attributes && attributes.length > 0) {
    const constructorArgs = attributes.join(', ');
    const assignmentLines = attributes
      .map((attribute) => `        self.${attribute} = ${attribute}`)
      .join('\n');
    body += `    def __init__(self, ${constructorArgs}):\n${assignmentLines}\n`;
  }

  if (methods && methods.length > 0) {
    if (body) body += '\n';
    const methodLines = methods
      .map((method) => {
        let processedMethod = method;
        if (method.endsWith('()')) {
            processedMethod = method.replace('()', '(self)');
        } else if (method.includes('(')) {
            processedMethod = method.replace('(', '(self, ');
        }
        return `    def ${processedMethod}:\n        pass`;
      })
      .join('\n\n');
    body += methodLines + '\n';
  }

  if (!body) {
    body = `    pass\n`;
  }

  return `${classHeader}\n${body.trimEnd()}`;
}

export function generatePythonClasses(elements, connectors) {
  const classElements = extractClasses(elements || []);
  const inheritanceMap = buildInheritanceMap(connectors || []);
  const classById = new Map();

  classElements.forEach((classElement) => {
    const parsedClass = parseClassText(classElement.text);

    if (parsedClass.className) {
      classById.set(classElement.id, parsedClass);
    }
  });

  const classDefinitions = classElements
    .map((classElement) => {
      const parsedClass = classById.get(classElement.id);
      if (!parsedClass) {
        return null;
      }

      const parentId = inheritanceMap.get(classElement.id);
      const parentClass = parentId ? classById.get(parentId) : null;
      const parentName = parentClass ? parentClass.className : null;

      return generateClassCode(parsedClass.className, parsedClass.attributes, parsedClass.methods, parentName);
    })
    .filter(Boolean);

  return classDefinitions.join('\n\n');
}

export { extractClasses, parseClassText, buildInheritanceMap, generateClassCode };
