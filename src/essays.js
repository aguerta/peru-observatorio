// Short data essays. Every number is taken from the validated tables in this
// app (see the linked indicator). Editorial voice, plain prose.
export const ESSAYS = [
  {
    slug: 'desigualdad',
    kicker: 'Desigualdad',
    question: '¿Es el Perú menos desigual que hace veinte años?',
    stat: { from: 0.49, to: 0.40, decimals: 2, label: 'Gini del ingreso, 2004 → 2025' },
    accent: '#c85a34',
    link: { schema: 'enaho', table: 'gini_nacional_tiempo' },
    body: [
      'En 2004 el ingreso se repartía con un Gini de 0.49. Para 2025 bajó a 0.40, la marca más baja que registra la ENAHO en dos décadas. La caída no fue en línea recta.',
      'En 2020 la pandemia la revirtió de golpe y el índice saltó a 0.45. El confinamiento golpeó más fuerte a quienes vivían del día a día en las ciudades, y por un año la desigualdad urbana superó a la rural. La recuperación posterior devolvió la tendencia de fondo.',
      'Lo más notable está en el detalle. En 2004 el campo era casi tan desigual como la ciudad. Hoy ambos rondan 0.38 y casi se tocan. El país reparte de forma más pareja que hace veinte años, aunque un Gini de 0.40 sigue siendo alto para América Latina.',
    ],
  },
  {
    slug: 'pobreza-dinamica',
    kicker: 'Pobreza',
    question: '¿La pobreza es una condición o un episodio?',
    stat: { from: 0, to: 57, decimals: 0, suffix: '%', label: 'hogares pobres alguna vez en 2007-2011' },
    accent: '#9c6b2f',
    link: { schema: 'panel', table: 'panel_pobreza_dinamica_2007_2011' },
    body: [
      'Cada año la foto de la pobreza cambia poco. Alrededor de un tercio de los hogares aparece debajo de la línea. Pero al seguir a las mismas familias durante cinco años, la historia es otra.',
      'Entre 2007 y 2011, el 57% de los hogares fue pobre en al menos una ola. Solo el 14% lo fue de forma crónica, atrapado casi todos los años. El 43% restante entró y salió, empujado por una mala cosecha, un empleo perdido, una enfermedad.',
      'La pobreza peruana es sobre todo movimiento. La condición permanente describe a una minoría. Eso cambia la política. Proteger a las familias de caídas temporales pesa tanto como sacar del fondo a quienes nunca logran salir.',
    ],
  },
  {
    slug: 'migracion',
    kicker: 'Migración',
    question: '¿Todos los caminos llevan a Lima?',
    stat: { from: 0, to: 25, decimals: 0, suffix: ' mil', label: 'personas al año entre Lima y Junín' },
    accent: '#8a4a6b',
    link: { schema: 'enaho', table: 'migracion_od_departamento' },
    body: [
      'Casi. La red de migración interna tiene un centro que no admite competencia. Junín, Áncash, Piura y la Amazonía envían a Lima decenas de miles de personas cada año.',
      'El mayor flujo conecta a Lima con Junín y mueve cerca de 25 mil personas anuales en cada dirección. Porque también hay regreso. Mucha gente que llegó a la capital vuelve a su región, y Lima figura como origen tanto como destino.',
      'El mapa dibuja una capital que absorbe sin ser una calle de un solo sentido. La sierra sur y la selva quedan más ligadas a Lima y entre sí que con la costa norte.',
    ],
  },
  {
    slug: 'confianza',
    kicker: 'Instituciones',
    question: '¿En quién confía el Perú?',
    stat: { from: 0, to: 44, decimals: 0, suffix: '%', label: 'confía en la Iglesia. En el Congreso, 3.5%' },
    accent: '#3f5aa6',
    link: { schema: 'enaho', table: 'trust_by_institution_2025' },
    body: [
      'En muy pocos, y no en quienes gobiernan. La institución con más respaldo es la Iglesia católica, con 44% de confianza. La sigue RENIEC, la oficina que emite el DNI, con 41%.',
      'En el otro extremo están los partidos políticos con 2.8% y el Congreso con 3.5%. La distancia entre la cima y el piso es de doce a uno.',
      'La confianza se concentra en lo que entrega algo concreto, un documento o un servicio, y se evapora frente a la representación política. Ese vacío es el terreno donde crecen los outsiders y las crisis de legitimidad que marcan cada elección.',
    ],
  },
  {
    slug: 'fecundidad',
    kicker: 'Demografía',
    question: '¿Por qué las peruanas tienen menos hijos?',
    stat: { from: 2.47, to: 1.73, decimals: 2, label: 'hijos por mujer, 2004 → 2024' },
    accent: '#157a6e',
    link: { schema: 'endes', table: 'endes_indicadores' },
    body: [
      'En 2004 una mujer tenía en promedio 2.5 hijos a lo largo de su vida. En 2024 son 1.73, por debajo del nivel de reemplazo. El Perú dejó de crecer por nacimientos.',
      'La caída acompaña a otra cifra que sube, los años de escuela y el acceso a educación superior. Las mujeres con más estudios tienen su primer hijo más tarde y tienen menos hijos en total — una asociación sólida en cada ENDES, aunque el corte transversal no separa cuánto es efecto de las aulas y cuánto de todo lo demás que llega con ellas.',
      'La transición demográfica corre en paralelo a la escolarización, no a las campañas — es una correlación, no un efecto causal medido, y lo decimos tal cual. Lo que sí es un hecho: el país que se forma tendrá menos niños y más adultos mayores, un giro que reordenará desde el sistema de pensiones hasta el mercado de trabajo.',
    ],
  },
  {
    slug: 'educacion-pobreza',
    kicker: 'Territorio',
    question: '¿La escuela rompe la herencia de la pobreza?',
    stat: { from: 0, to: -0.54, decimals: 2, label: 'correlación educación–pobreza entre departamentos' },
    accent: '#b4501f',
    link: { schema: 'enaho', table: 'scatter_edu_pobreza_dep_2025' },
    body: [
      'A nivel departamental la relación es nítida. Donde la gente acumula más años de educación, hay menos pobreza. La correlación llega a -0.54, fuerte para datos sociales.',
      'Cajamarca y Huancavelica reúnen baja escolaridad y alta pobreza. Lima, Ica y Arequipa muestran el patrón inverso. La educación covaría con cerca del 30% de las diferencias de pobreza entre regiones (el R² de esa correlación) — describe cuánto se mueven juntas, no cuánta pobreza eliminaría un año más de escuela.',
      'Y la correlación no reparte causas: la geografía y el mercado laboral covarían con la escuela y con la pobreza a la vez. Identificar el efecto causal de la educación exige más que un corte transversal, y este observatorio no lo pretende con estos datos. Esto es una asociación, no un efecto causal.',
    ],
  },
]
