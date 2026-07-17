import type { Locale } from '../constants/locales';

export type LandingCopy = {
  nav: { about: string; method: string; pricing: string; signIn: string; start: string };
  hero: {
    eyebrow: string;
    title: string;
    titleSerif: string;
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    badgeLabel: string;
    badgeText: string;
  };
  about: { eyebrow: string; title: string; titleSerif: string; paragraphs: string[] };
  method: {
    eyebrow: string;
    titlePre: string;
    titleSerif: string;
    titlePost: string;
    lead: string;
    steps: { title: string; text: string }[];
    idTitle: string;
    idText: string;
  };
  learn: {
    title: string;
    titleSerif: string;
    lead: string;
    badgeLabel: string;
    badgeText: string;
    features: string[];
  };
  decisions: { eyebrow: string; title: string; titleSerif: string; paragraphs: string[] };
  pricing: {
    title: string;
    lead: string;
    tagline: string;
    contact: string;
    plans: { id: string; name: string; title: string; description: string; features: string[] }[];
  };
  cta: { title: string; titleSerif: string; lead: string; button: string };
  footer: {
    tagline: string;
    ecosystem: string;
    sprintColumn: string;
    method: string;
    pricing: string;
    start: string;
    rights: string;
  };
};

export const landingTranslations: Record<Locale, LandingCopy> = {
  pt: {
    nav: {
      about: 'O Sprint',
      method: 'Metodologia',
      pricing: 'Planos',
      signIn: 'Entrar',
      start: 'Começar',
    },
    hero: {
      eyebrow: 'Magnus Mind · Sprint',
      title: 'Toda organização sabe o que precisa fazer.',
      titleSerif: 'Poucas conseguem executar.',
      lead: 'O Sprint é uma plataforma de execução organizacional. Transforma prioridades em planos de ação, conecta equipes, acompanha a evolução da mudança e ajuda sua organização a executar com mais clareza, velocidade e consistência.',
      ctaPrimary: 'Começar minha primeira Sprint Wave',
      ctaSecondary: 'Conhecer a metodologia',
      badgeLabel: 'Sprint Wave',
      badgeText: 'Diagnóstico → Design → Difusão → Domínio',
    },
    about: {
      eyebrow: 'O problema',
      title: 'A estratégia não falha no planejamento.',
      titleSerif: 'Ela falha na execução.',
      paragraphs: [
        'Todos os dias, organizações definem prioridades, iniciam projetos e lançam iniciativas importantes.',
        'Mas, ao longo do caminho, surgem novos desafios, prioridades mudam, equipes perdem alinhamento e o conhecimento construído em um ciclo acaba se perdendo no seguinte.',
        'O Sprint foi criado para resolver exatamente esse problema: transformar estratégia em execução contínua.',
      ],
    },
    method: {
      eyebrow: 'Sprint Wave',
      titlePre: 'Um ciclo ',
      titleSerif: 'contínuo',
      titlePost: ' de evolução organizacional',
      lead: 'Cada Sprint Wave transforma aprendizado em ação. O conhecimento gerado em uma etapa alimenta a próxima, criando um processo contínuo de melhoria — não projetos isolados que começam do zero.',
      steps: [
        { title: 'Diagnóstico', text: 'Compreenda a realidade da organização antes de decidir.' },
        { title: 'Design', text: 'Transforme prioridades em um plano claro de execução.' },
        { title: 'Difusão', text: 'Mobilize pessoas, acompanhe iniciativas e fortaleça a adoção.' },
        { title: 'Domínio', text: 'Consolide aprendizados e acelere a evolução.' },
      ],
      idTitle: 'Intelligence Dashboard',
      idText:
        'Monitore indicadores, receba recomendações inteligentes e acompanhe o progresso da transformação com total clareza.',
    },
    learn: {
      title: 'Execute melhor.',
      titleSerif: 'Aprenda continuamente.',
      lead: 'Enquanto ferramentas tradicionais organizam tarefas, o Sprint ajuda organizações a transformar decisões em resultados. Cada Sprint Wave preserva o contexto, registra aprendizados e fortalece a capacidade da organização de evoluir continuamente.',
      badgeLabel: 'RAG',
      badgeText: 'Memória organizacional entre ciclos',
      features: [
        'Estratégia e execução conectadas',
        'Memória organizacional entre ciclos',
        'Conhecimento estruturado via RAG',
        'Tecnologia apoiando decisões, não substituindo pessoas',
        'Especialistas humanos desenvolvendo curadoria',
        'Segurança da informação',
        'Accountability distribuída',
        'Evolução mensurável',
      ],
    },
    decisions: {
      eyebrow: 'Além do dashboard',
      title: 'As empresas não precisam de mais dashboards.',
      titleSerif: 'Precisam tomar decisões melhores.',
      paragraphs: [
        'Decisões melhores geram organizações melhores.',
        'O Sprint não existe apenas para acompanhar projetos. Ele existe para ajudar líderes e equipes a decidir com mais clareza, agir com mais rapidez e aprender continuamente com cada ciclo realizado.',
        'Porque executar bem nunca depende apenas do plano. Depende da qualidade das decisões tomadas todos os dias.',
      ],
    },
    pricing: {
      title: 'Escolha a capacidade que acompanha o crescimento da sua organização.',
      lead: 'Todos os planos incluem a experiência completa do Sprint. A diferença está apenas na quantidade de Sprint Waves que sua organização pode conduzir simultaneamente.',
      tagline: 'Você cresce no seu ritmo, sem mudar de plataforma.',
      contact: 'Assinar agora',
      plans: [
        {
          id: 'starter',
          name: 'Starter',
          title: 'Ideal para validar o método',
          description:
            'Conduza sua primeira Sprint Wave e estabeleça uma nova forma de transformar estratégia em execução.',
          features: ['1 Sprint Wave ativa', 'Intelligence Dashboard', 'Curadoria de especialistas'],
        },
        {
          id: 'advanced',
          name: 'Advanced',
          title: 'Várias iniciativas em paralelo',
          description: 'Mais velocidade. Mais colaboração. Mais capacidade de execução.',
          features: [
            'Múltiplas Sprint Waves simultâneas',
            'Colaboração ampliada',
            'Memória organizacional avançada',
          ],
        },
        {
          id: 'premium',
          name: 'Premium',
          title: 'Transformação como prática contínua',
          description:
            'Criado para empresas e consultorias que fazem da transformação uma prática contínua. Sem limites para crescer.',
          features: ['Sprint Waves ilimitadas', 'Suporte dedicado', 'Integrações personalizadas'],
        },
      ],
    },
    cta: {
      title: 'Sua estratégia',
      titleSerif: 'merece sair do papel.',
      lead: 'Comece a construir uma organização que aprende continuamente, executa com consistência e evolui a cada novo ciclo.',
      button: 'Começar minha primeira Sprint Wave',
    },
    footer: {
      tagline: 'Plataforma de execução organizacional.',
      ecosystem: 'Ecossistema Magnus Mind',
      sprintColumn: 'Sprint',
      method: 'Metodologia',
      pricing: 'Planos',
      start: 'Começar',
      rights: 'Todos os direitos reservados.',
    },
  },
  en: {
    nav: {
      about: 'About Sprint',
      method: 'Methodology',
      pricing: 'Pricing',
      signIn: 'Sign in',
      start: 'Get started',
    },
    hero: {
      eyebrow: 'Magnus Mind · Sprint',
      title: 'Every organization knows what it needs to do.',
      titleSerif: 'Few manage to execute.',
      lead: 'Sprint is an organizational execution platform. It turns priorities into action plans, connects teams, tracks the evolution of change, and helps your organization execute with more clarity, speed, and consistency.',
      ctaPrimary: 'Start my first Sprint Wave',
      ctaSecondary: 'Explore the methodology',
      badgeLabel: 'Sprint Wave',
      badgeText: 'Diagnostic → Design → Diffusion → Domain',
    },
    about: {
      eyebrow: 'The problem',
      title: "Strategy doesn't fail in planning.",
      titleSerif: 'It fails in execution.',
      paragraphs: [
        'Every day, organizations set priorities, start projects, and launch important initiatives.',
        'But along the way, new challenges emerge, priorities shift, teams lose alignment, and the knowledge built in one cycle ends up lost in the next.',
        'Sprint was created to solve exactly this problem: turning strategy into continuous execution.',
      ],
    },
    method: {
      eyebrow: 'Sprint Wave',
      titlePre: 'A ',
      titleSerif: 'continuous',
      titlePost: ' cycle of organizational evolution',
      lead: 'Each Sprint Wave turns learning into action. The knowledge generated in one stage feeds the next, creating a continuous improvement process — not isolated projects that start from scratch.',
      steps: [
        { title: 'Diagnostic', text: 'Understand the reality of the organization before deciding.' },
        { title: 'Design', text: 'Turn priorities into a clear execution plan.' },
        { title: 'Diffusion', text: 'Mobilize people, track initiatives, and strengthen adoption.' },
        { title: 'Domain', text: 'Consolidate learnings and accelerate evolution.' },
      ],
      idTitle: 'Intelligence Dashboard',
      idText:
        'Monitor indicators, receive intelligent recommendations, and track transformation progress with total clarity.',
    },
    learn: {
      title: 'Execute better.',
      titleSerif: 'Learn continuously.',
      lead: 'While traditional tools organize tasks, Sprint helps organizations turn decisions into results. Each Sprint Wave preserves context, records learnings, and strengthens the organization’s ability to evolve continuously.',
      badgeLabel: 'RAG',
      badgeText: 'Organizational memory across cycles',
      features: [
        'Strategy and execution connected',
        'Organizational memory across cycles',
        'Structured knowledge via RAG',
        'Technology supporting decisions, not replacing people',
        'Human experts curating content',
        'Information security',
        'Distributed accountability',
        'Measurable evolution',
      ],
    },
    decisions: {
      eyebrow: 'Beyond the dashboard',
      title: "Companies don't need more dashboards.",
      titleSerif: 'They need to make better decisions.',
      paragraphs: [
        'Better decisions create better organizations.',
        'Sprint doesn’t exist just to track projects. It exists to help leaders and teams decide with more clarity, act faster, and learn continuously with every cycle.',
        'Because executing well never depends on the plan alone. It depends on the quality of the decisions made every day.',
      ],
    },
    pricing: {
      title: 'Choose the capacity that grows with your organization.',
      lead: 'All plans include the full Sprint experience. The only difference is how many Sprint Waves your organization can run simultaneously.',
      tagline: 'You grow at your own pace, without switching platforms.',
      contact: 'Subscribe now',
      plans: [
        {
          id: 'starter',
          name: 'Starter',
          title: 'Ideal for validating the method',
          description:
            'Run your first Sprint Wave and establish a new way of turning strategy into execution.',
          features: ['1 active Sprint Wave', 'Intelligence Dashboard', 'Expert curation'],
        },
        {
          id: 'advanced',
          name: 'Advanced',
          title: 'Multiple initiatives in parallel',
          description: 'More speed. More collaboration. More execution capacity.',
          features: [
            'Multiple simultaneous Sprint Waves',
            'Expanded collaboration',
            'Advanced organizational memory',
          ],
        },
        {
          id: 'premium',
          name: 'Premium',
          title: 'Transformation as a continuous practice',
          description:
            'Built for companies and consultancies that make transformation a continuous practice. No limits to grow.',
          features: ['Unlimited Sprint Waves', 'Dedicated support', 'Custom integrations'],
        },
      ],
    },
    cta: {
      title: 'Your strategy',
      titleSerif: 'deserves to leave the paper.',
      lead: 'Start building an organization that learns continuously, executes with consistency, and evolves with every new cycle.',
      button: 'Start my first Sprint Wave',
    },
    footer: {
      tagline: 'Organizational execution platform.',
      ecosystem: 'Magnus Mind Ecosystem',
      sprintColumn: 'Sprint',
      method: 'Methodology',
      pricing: 'Pricing',
      start: 'Get started',
      rights: 'All rights reserved.',
    },
  },
  es: {
    nav: {
      about: 'El Sprint',
      method: 'Metodología',
      pricing: 'Planes',
      signIn: 'Entrar',
      start: 'Comenzar',
    },
    hero: {
      eyebrow: 'Magnus Mind · Sprint',
      title: 'Toda organización sabe lo que necesita hacer.',
      titleSerif: 'Pocas logran ejecutar.',
      lead: 'Sprint es una plataforma de ejecución organizacional. Transforma prioridades en planes de acción, conecta equipos, acompaña la evolución del cambio y ayuda a su organización a ejecutar con más claridad, velocidad y consistencia.',
      ctaPrimary: 'Comenzar mi primera Sprint Wave',
      ctaSecondary: 'Conocer la metodología',
      badgeLabel: 'Sprint Wave',
      badgeText: 'Diagnóstico → Diseño → Difusión → Dominio',
    },
    about: {
      eyebrow: 'El problema',
      title: 'La estrategia no falla en la planificación.',
      titleSerif: 'Falla en la ejecución.',
      paragraphs: [
        'Todos los días, las organizaciones definen prioridades, inician proyectos y lanzan iniciativas importantes.',
        'Pero, en el camino, surgen nuevos desafíos, las prioridades cambian, los equipos pierden alineación y el conocimiento construido en un ciclo termina perdiéndose en el siguiente.',
        'Sprint fue creado para resolver exactamente ese problema: transformar la estrategia en ejecución continua.',
      ],
    },
    method: {
      eyebrow: 'Sprint Wave',
      titlePre: 'Un ciclo ',
      titleSerif: 'continuo',
      titlePost: ' de evolución organizacional',
      lead: 'Cada Sprint Wave transforma el aprendizaje en acción. El conocimiento generado en una etapa alimenta la siguiente, creando un proceso continuo de mejora — no proyectos aislados que empiezan de cero.',
      steps: [
        { title: 'Diagnóstico', text: 'Comprenda la realidad de la organización antes de decidir.' },
        { title: 'Diseño', text: 'Transforme prioridades en un plan claro de ejecución.' },
        { title: 'Difusión', text: 'Movilice personas, acompañe iniciativas y fortalezca la adopción.' },
        { title: 'Dominio', text: 'Consolide aprendizajes y acelere la evolución.' },
      ],
      idTitle: 'Intelligence Dashboard',
      idText:
        'Monitoree indicadores, reciba recomendaciones inteligentes y acompañe el progreso de la transformación con total claridad.',
    },
    learn: {
      title: 'Ejecute mejor.',
      titleSerif: 'Aprenda continuamente.',
      lead: 'Mientras las herramientas tradicionales organizan tareas, Sprint ayuda a las organizaciones a transformar decisiones en resultados. Cada Sprint Wave preserva el contexto, registra aprendizajes y fortalece la capacidad de la organización de evolucionar continuamente.',
      badgeLabel: 'RAG',
      badgeText: 'Memoria organizacional entre ciclos',
      features: [
        'Estrategia y ejecución conectadas',
        'Memoria organizacional entre ciclos',
        'Conocimiento estructurado vía RAG',
        'Tecnología apoyando decisiones, no reemplazando personas',
        'Expertos humanos desarrollando curaduría',
        'Seguridad de la información',
        'Accountability distribuida',
        'Evolución medible',
      ],
    },
    decisions: {
      eyebrow: 'Más allá del dashboard',
      title: 'Las empresas no necesitan más dashboards.',
      titleSerif: 'Necesitan tomar mejores decisiones.',
      paragraphs: [
        'Mejores decisiones generan mejores organizaciones.',
        'Sprint no existe solo para acompañar proyectos. Existe para ayudar a líderes y equipos a decidir con más claridad, actuar con más rapidez y aprender continuamente con cada ciclo realizado.',
        'Porque ejecutar bien nunca depende solo del plan. Depende de la calidad de las decisiones tomadas todos los días.',
      ],
    },
    pricing: {
      title: 'Elija la capacidad que acompaña el crecimiento de su organización.',
      lead: 'Todos los planes incluyen la experiencia completa de Sprint. La diferencia está solo en la cantidad de Sprint Waves que su organización puede conducir simultáneamente.',
      tagline: 'Usted crece a su ritmo, sin cambiar de plataforma.',
      contact: 'Suscribirse ahora',
      plans: [
        {
          id: 'starter',
          name: 'Starter',
          title: 'Ideal para validar el método',
          description:
            'Conduzca su primera Sprint Wave y establezca una nueva forma de transformar estrategia en ejecución.',
          features: ['1 Sprint Wave activa', 'Intelligence Dashboard', 'Curaduría de expertos'],
        },
        {
          id: 'advanced',
          name: 'Advanced',
          title: 'Varias iniciativas en paralelo',
          description: 'Más velocidad. Más colaboración. Más capacidad de ejecución.',
          features: [
            'Múltiples Sprint Waves simultáneas',
            'Colaboración ampliada',
            'Memoria organizacional avanzada',
          ],
        },
        {
          id: 'premium',
          name: 'Premium',
          title: 'Transformación como práctica continua',
          description:
            'Creado para empresas y consultorías que hacen de la transformación una práctica continua. Sin límites para crecer.',
          features: ['Sprint Waves ilimitadas', 'Soporte dedicado', 'Integraciones personalizadas'],
        },
      ],
    },
    cta: {
      title: 'Su estrategia',
      titleSerif: 'merece salir del papel.',
      lead: 'Comience a construir una organización que aprende continuamente, ejecuta con consistencia y evoluciona con cada nuevo ciclo.',
      button: 'Comenzar mi primera Sprint Wave',
    },
    footer: {
      tagline: 'Plataforma de ejecución organizacional.',
      ecosystem: 'Ecosistema Magnus Mind',
      sprintColumn: 'Sprint',
      method: 'Metodología',
      pricing: 'Planes',
      start: 'Comenzar',
      rights: 'Todos los derechos reservados.',
    },
  },
};
