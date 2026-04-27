function runBasicChecks(elements, connectors) {
  const errors = [];

  if (elements.length === 0) {
    errors.push('Diagram cannot be empty');
  }

  const elementIds = new Set(elements.map((element) => element.id));

  connectors.forEach((connector) => {
    const hasFrom = elementIds.has(connector.fromElement);
    const hasTo = elementIds.has(connector.toElement);

    if (!hasFrom || !hasTo) {
      errors.push('Connector references non-existing element');
    }
  });

  return errors;
}

function runSequenceChecks(elements) {
  const errors = [];
  const participants = elements.filter((e) => e.type === 'participant');
  if (participants.length === 0 && elements.length > 0) {
    errors.push('UML Sequence diagrams should include at least one participant (lifeline)');
  }
  return errors;
}

function runUseCaseChecks(elements) {
  const errors = [];
  if (elements.length === 0) return errors;
  const hasActor = elements.some((e) => e.type === 'actor');
  const hasUseCase = elements.some((e) => e.type === 'ellipse');
  if (!hasActor) {
    errors.push('Use case diagrams typically include at least one actor');
  }
  if (!hasUseCase) {
    errors.push('Use case diagrams typically include use cases (ellipse shapes)');
  }
  return errors;
}

function runDeploymentChecks(elements, connectors) {
  const errors = [];
  const nodes = elements.filter((e) => e.type === 'node' || e.type === 'database' || e.type === 'component');
  if (elements.length > 0 && nodes.length === 0) {
    errors.push('UML Deployment diagrams usually show nodes, components, or databases');
  }
  const floating = nodes.filter((n) => connectors.every((c) => c.fromElement !== n.id && c.toElement !== n.id));
  if (nodes.length > 1 && floating.length === nodes.length) {
    errors.push('Link deployment elements with connectors to show communication or deployment');
  }
  return errors;
}

function runTemplateChecks(elements, connectors, templateType) {
  const errors = [];
  
  const hasFlowchartNodes = elements.some(e => e.type === 'start' || e.type === 'end' || e.type === 'diamond');
  const hasUMLClassNodes = elements.some(e => e.type === 'class');

  const tt = (templateType || '').trim().toLowerCase();

  const isActivityOrFlowchart =
    tt === 'flowchart' ||
    tt === 'uml activity';

  if (isActivityOrFlowchart) {
    errors.push(...runFlowchartChecks(elements, connectors));
  }

  const isClassDiagram =
    tt === 'uml class diagram' ||
    tt === 'uml_class';

  if (isClassDiagram || hasUMLClassNodes) {
    errors.push(...runUMLChecks(elements, connectors));
  }

  if (tt === 'uml sequence' || tt === 'sequence') {
    errors.push(...runSequenceChecks(elements));
  }

  if (tt === 'uml use case' || tt === 'usecase') {
    errors.push(...runUseCaseChecks(elements));
  }

  if (tt === 'uml deployment' || tt === 'deployment') {
    errors.push(...runDeploymentChecks(elements, connectors));
  }

  return errors;
}

function runFlowchartChecks(elements, connectors) {
  const errors = [];
  const startNodes = elements.filter((element) => element.type === 'start');
  const endNodes = elements.filter((element) => element.type === 'end');

  if (startNodes.length === 0) {
    errors.push('Flowchart must contain a Start node');
  }

  if (startNodes.length > 1) {
    errors.push('Flowchart cannot contain multiple Start nodes');
  }

  if (endNodes.length === 0) {
    errors.push('Flowchart must contain at least one End node');
  }

  startNodes.forEach((startNode) => {
    const hasIncomingConnection = connectors.some(
      (connector) => connector.toElement === startNode.id
    );

    if (hasIncomingConnection) {
      errors.push('Start node cannot have incoming connections');
    }
  });

  return errors;
}

function runUMLChecks(elements, connectors) {
  const errors = [];
  const elementById = new Map(elements.map((element) => [element.id, element]));

  connectors.forEach((connector) => {
    const isInheritance = connector.type === 'inheritance' || (connector.text && connector.text.toLowerCase().includes('inherit'));
    
    if (!isInheritance) {
      return;
    }

    if (connector.fromElement === connector.toElement) {
      errors.push('A class cannot inherit from itself');
    }

    const fromElement = elementById.get(connector.fromElement);
    const toElement = elementById.get(connector.toElement);

    if (fromElement?.type !== 'class' || toElement?.type !== 'class') {
      errors.push('Inheritance relationships must connect two classes');
    }
  });

  return errors;
}

export function validateDiagram(elements, connectors, templateType) {
  const basicErrors = runBasicChecks(elements, connectors);
  const templateErrors = runTemplateChecks(elements, connectors, templateType);
  const errors = [...basicErrors, ...templateErrors];

  return {
    valid: errors.length === 0,
    errors,
  };
}

export { runBasicChecks, runTemplateChecks };
