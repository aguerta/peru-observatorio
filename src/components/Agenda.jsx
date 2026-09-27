import StoryChart from './StoryChart'

// La agenda pendiente: qué debe mejorar el Perú según sus propios datos.
// Cada número sale de una tabla validada de este observatorio y cada bloque
// enlaza al indicador vivo. El criterio de selección es duro: entran los
// frentes donde la serie NO se movió mientras todo lo demás mejoraba.
export default function Agenda() {
  return (
    <div className="movilidad agenda">
      <div className="exp-crumb">ANÁLISIS · LA AGENDA PENDIENTE</div>
      <h1>Qué debe mejorar el Perú</h1>
      <p className="gf-lead">Entre 2004 y 2025 la pobreza cayó de 58.7% a 25.7% y el Gini
        bajó de 0.49 a 0.40. Esa es la mitad de la historia que ya se contó. Esta página
        cuenta la otra mitad: las seis series que se quedaron quietas mientras el país
        crecía. No son opiniones. Son los indicadores de este mismo observatorio que no
        acompañaron la mejora, y por eso marcan la agenda.</p>

      <div className="section-label">Frente 1 · La informalidad no baja de 72%</div>
      <StoryChart kicker="EMPLEO" title="La línea que no baja"
        kind="line" schema="enaho" table="informalidad_reconstruida"
        series="informal_reconstruido" x="year" ylabel="Empleo informal (%)"
        cta="Explora el indicador →"
        lede="Empleo informal como % de la población ocupada, 2005-2025. Dos décadas de crecimiento compraron ocho puntos, de ~80% a 72%, y ahí se plantó desde 2016." />
      <p className="mov-texto">Tres de cada cuatro trabajadores peruanos siguen sin
        contrato ni pensión. El detalle importante está en la composición: el empleo
        asalariado subió de 38% a 50% de los ocupados y el trabajo familiar no remunerado
        se redujo a la mitad, o sea que la estructura del empleo SÍ se modernizó. Lo que
        no siguió fue el contrato. El país genera puestos, pero los genera fuera del
        sistema, y el mínimo de 72% tocado en 2016 volvió a ser el techo después de la
        pandemia.</p>
      <p className="mov-texto">Qué tendría que moverse, según estos datos: la
        formalización dejó de responder al crecimiento hace una década, así que esperar
        que el PBI la arrastre ya no es un plan. La serie sugiere que el margen está en
        el costo de formalizar a la microempresa y al independiente, que es donde la
        informalidad se concentra, y no en el asalariado de empresa grande, que ya está
        mayormente dentro.</p>

      <div className="section-label">Frente 2 · Salud: cobertura récord, acceso congelado</div>
      <StoryChart kicker="SALUD" title="El seguro llegó, la consulta no"
        kind="line" reverse schema="enaho" table="atencion_salud_tiempo"
        series="seek_all" x="year" ylabel="Consultó a un profesional (%)"
        cta="Explora el indicador →"
        lede="% de personas con un problema de salud que consultó a un profesional, 2007-2025. El aseguramiento pasó de 37% a 93% de la población en el mismo periodo. La consulta sigue en un tercio." />
      <p className="mov-texto">Es el contraste más incómodo del observatorio. El SIS
        multiplicó por cuatro la población asegurada y eliminó la barrera del dinero: la
        razón «no tuve plata para atenderme» colapsó de 22% a 4%. Pero la proporción de
        enfermos que llega a un profesional está en 32.6%, casi idéntica al 30.9% de
        2007. Lo que quedó al descubierto es la barrera no financiera: «no era grave»
        (48%) y la automedicación (~24%) dominan las razones de no atención.</p>
      <p className="mov-texto">Qué tendría que moverse: la agenda ya no es afiliar, es
        que el seguro sirva. Distancia, espera y percepción de calidad son ahora el
        cuello de botella, y ninguna de las tres se arregla con más carnets. El gradiente
        persistente (EsSalud 41%, SIS 31%, sin seguro 12%) dice que el problema es la
        oferta detrás de cada seguro, no la demanda.</p>

      <div className="section-label">Frente 3 · Educación: más acceso, la misma herencia</div>
      <StoryChart kicker="JÓVENES" title="Uno de cada cinco, dos décadas seguidas"
        kind="line" schema="enaho" table="neet_juvenil_tiempo_2004_2025"
        series="Total" x="year" ylabel="Jóvenes ni-ni 15-24 (%)"
        cta="Explora el indicador →"
        lede="% de jóvenes de 15-24 que ni estudia ni trabaja, 2004-2025. De 25% a 22% en veintiún años, con salto a 33% en 2020. La serie que el crecimiento no tocó." />
      <p className="mov-texto">La matrícula subió para todos y cada cohorte estudió más
        que la anterior. Dos cosas no se movieron. Primero, los ni-ni: uno de cada cinco
        jóvenes lleva veinte años fuera de la escuela y del empleo, con las mujeres
        siempre arriba (25.2% en 2025) por el trabajo de cuidados que la encuesta no
        remunera. Segundo, la herencia: la asistencia a educación superior de los
        jóvenes de hogares con jefe de primaria subió de 24.6% a 35.3%, pero la ventaja
        de nacer en un hogar con jefe de educación superior sigue en 19 puntos, casi
        igual que los 21.6 de 2004. El piso subió, la distancia no se acortó.</p>
      <p className="mov-texto">Qué tendría que moverse: la transición
        secundaria→superior del estudiante de primera generación, que es exactamente
        donde el gradiente se abre. El detalle completo, matriz de origen y destino
        incluida, está en la sección de movilidad educativa de este observatorio.</p>

      <div className="section-label">Frente 4 · Género: paridad educativa sin paridad de paga</div>
      <StoryChart kicker="BRECHA SALARIAL" title="El título no cierra la brecha"
        kind="line" reverse schema="enaho" table="brecha_salarial_grupos_tiempo_2004_2025"
        series="univ" x="year" ylabel="Paga femenina / masculina (universitarios)"
        cta="Explora el indicador →"
        lede="Ingreso laboral femenino como proporción del masculino entre asalariados con educación universitaria, 2004-2025. Plano en ~0.85 durante veinte años." />
      <p className="mov-texto">Las mujeres alcanzaron y superaron a los hombres en
        educación: las cohortes nacidas desde el 2000 ya llevan más años de escuela.
        La paga no siguió el mismo camino. Una universitaria gana alrededor de 85
        céntimos por cada sol de un universitario, la misma proporción que en 2004. La
        brecha total sí se redujo (de 28% a 20%), pero se redujo en los márgenes, entre
        jóvenes y en el empleo formal, mientras el núcleo de los 40-54 años permanece
        intacto. La serie de ni-ni cuenta la otra cara: el costo del cuidado cae sobre
        ellas antes de entrar al mercado.</p>
      <p className="mov-texto">Qué tendría que moverse: los datos descartan que falte
        educación femenina. Lo que la serie señala es la penalización por maternidad y
        cuidados en la edad central de la carrera, que ni el título universitario ni
        veinte años de crecimiento diluyeron.</p>

      <div className="section-label">Frente 5 · Una economía que no cambia de forma</div>
      <StoryChart kicker="ESTRUCTURA" title="El empleo vulnerable se atascó"
        kind="line" schema="enaho" table="estructura_empleo_2004_2025"
        series="vulnerable" x="year" ylabel="Empleo vulnerable OIT (%)"
        cta="Explora el indicador →"
        lede="Empleo vulnerable (independientes + trabajo familiar no remunerado, definición OIT) como % del empleo, 2004-2025. Bajó de 53% a 44% y dejó de bajar hace una década." />
      <p className="mov-texto">Los paneles de la ENAHO siguen a los mismos trabajadores
        durante cinco años, y el resultado es de una estabilidad notable: en las diez
        ventanas disponibles, de 2007-2011 a 2019-2023, entre 66% y 72% de los
        trabajadores sigue en el mismo sector cuatro años después. Ni la pandemia movió
        esa cifra. El cambio que existe circula entre agro, comercio y manufactura, los
        sectores de baja barrera de entrada, que intercambian trabajadores entre sí. La
        agricultura sigue empleando a casi un cuarto del país con la productividad más
        baja de todos los sectores.</p>
      <p className="mov-texto">Qué tendría que moverse: la transformación estructural,
        que es el nombre técnico de «que la gente pueda pasar de sectores de
        subsistencia a sectores de productividad». La red completa de flujos entre
        sectores, panel por panel, está en la sección de gráficos.</p>

      <div className="section-label">Frente 6 · Un Estado en el que nadie confía</div>
      <StoryChart kicker="INSTITUCIONES" title="El derrumbe de la representación"
        kind="line" reverse schema="enaho" table="confianza_instituciones_tiempo_2007_2025"
        series="Congreso" x="year" ylabel="Confía en el Congreso (%)"
        cta="Explora el indicador →"
        lede="% que confía en el Congreso, 2007-2025. De 12.7% a 3.5%. Los partidos políticos están en 2.8%. La institución más confiada del país es la Iglesia, con 44%." />
      <p className="mov-texto">Este frente es distinto a los cinco anteriores porque no
        es un resultado social sino la restricción que condiciona a todos los demás. Las
        reformas de formalización, de salud o de educación necesitan años de
        continuidad, y la continuidad necesita instituciones con licencia social para
        sostenerla. Esa licencia hoy no existe: la confianza se concentra en lo que
        entrega algo tangible (RENIEC, la Iglesia) y se evapora en la representación.
        El dato más revelador de la serie es quién desconfía más: no son los jóvenes,
        son los mayores, y la Sierra rural e indígena desconfía sistemáticamente más
        que la costa. El cinismo peruano se acumula con la experiencia.</p>
      <p className="mov-texto">Qué tendría que moverse: es el único frente donde los
        datos no sugieren un instrumento, solo miden el hueco. Con 3.5% de confianza en
        el Congreso, cualquier agenda de este tamaño empieza por reconstruir al
        reformador antes que la reforma.</p>

      <div className="section-label">La agenda en seis números</div>
      <p className="mov-texto"><strong>72%</strong> de empleo informal, estancado desde
        2016 · <strong>1 de 3</strong> enfermos llega a consulta, igual que en 2007 ·
        <strong> 19 puntos</strong> de ventaja por origen en el acceso a educación
        superior, casi los mismos que en 2004 · <strong>0.85</strong> por sol: la paga
        universitaria femenina, plana veinte años · <strong>7 de 10</strong> trabajadores
        en el mismo sector tras cuatro años, en los diez paneles · <strong>3.5%</strong>
        de confianza en el Congreso. Donde el Perú mejoró, mejoró mucho. Estos seis
        números marcan dónde no.</p>

      <p className="mov-limite">Método: cada serie sale de los microdatos INEI procesados
        y validados en este observatorio (ENAHO, paneles ENAHO, módulo de gobernabilidad),
        con pesos oficiales y rupturas de comparabilidad documentadas en la metodología.
        La selección de frentes es editorial, los números no.</p>
    </div>
  )
}
