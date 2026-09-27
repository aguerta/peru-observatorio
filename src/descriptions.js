// One plain-Spanish sentence per key table: what am I looking at, in words a
// visitor with zero statistics can use. Prefix rules cover windowed families.
const DESC = {
  official_poverty_replication: 'Porcentaje de peruanos cuyo gasto no alcanza la canasta básica (pobreza monetaria), calculado desde la encuesta original y comparado con la cifra oficial del INEI: coinciden exactamente.',
  gini_nacional_tiempo: 'El Gini mide qué tan repartido está el ingreso: 0 sería todos iguales y 100 uno se lleva todo. Perú ha bajado sostenidamente desde 2004.',
  gini_departamento_tiempo: 'El mismo Gini (0 = todos iguales, 100 = uno se lleva todo), pero región por región.',
  income_percentiles_tiempo: 'Cuánto vive al mes una persona en distintos puntos de la escalera: p10 es de los más pobres, la mediana es el peruano del medio, p90 de los más ricos. En soles constantes de 2025.',
  gic_periodos: 'Cuánto creció por año el ingreso real de cada percentil: si la curva baja de izquierda a derecha, los pobres ganaron más que los ricos (crecimiento pro-pobre).',
  informalidad_reconstruida: 'Porcentaje de trabajadores sin contrato ni aporte a pensión, reconstruido desde la encuesta y comparado con la cifra oficial.',
  income_real_national: 'Ingreso promedio por persona al mes, en soles constantes a precios de Lima, con el método oficial del INEI.',
  endes_indicadores: 'Los grandes indicadores de salud y familia: hijos por mujer, desnutrición infantil, maternidad adolescente, educación.',
  epen_lima_movil_2001_2026: 'El pulso mensual del empleo en Lima: desempleo, actividad e ingreso, desde 2001.',
  seguro_salud_2004_2025: 'Qué porcentaje de peruanos tiene algún seguro de salud y de qué tipo (SIS público, EsSalud contributivo).',
  vivienda_servicios_2004_2025: 'De cada 100 hogares, cuántos tienen agua de red, luz eléctrica y celular.',
  voto_keiko_departamento: 'Porcentaje de votos válidos por Keiko Fujimori en la segunda vuelta, por departamento (ONPE).',
  voto_keiko_distrito_2021_2026: 'El voto por Keiko Fujimori en cada uno de los 1,874 distritos, en las segundas vueltas de 2021 y 2026 (ONPE).',
  paises_pobreza685_wdi: 'Pobreza medida con la misma vara en todos los países ($6.85 al día, Banco Mundial), para comparar al Perú con sus vecinos. Las líneas de pobreza nacionales NO son comparables entre países.',
  paises_gini_tiempo_wdi: 'Desigualdad (Gini) del Perú y sus vecinos, con la medición homogénea del Banco Mundial.',
  budget_composition_2004_2025: 'De cada 100 soles que gasta un hogar, cuántos van a comida, vivienda, transporte y lo demás.',
  trust_by_institution_2025: 'Porcentaje de peruanos que confía en cada institución, de la RENIEC al Congreso.',
  migracion_od_departamento: 'Cuántas personas se mudaron de un departamento a otro: cada línea es un flujo origen-destino.',
  eea_productividad_sector: 'Cuánto valor agregado genera un trabajador promedio en cada sector, según los estados financieros de las empresas.',
  bienes_durables_difusion_2004_2025: 'De cada 100 hogares, cuántos tienen refrigeradora, computadora, lavadora o auto, año a año.',
  neet_juvenil_tiempo_2004_2025: 'Porcentaje de jóvenes que ni estudian ni trabajan.',
  brecha_salarial_sexo_2004_2025: 'Cuánto gana una mujer por cada 100 soles que gana un hombre, y cómo ha cambiado.',
}

const CENSOS = {
  movilidad_matriz_educacion: 'De cada 100 hijos de un hogar con cierto nivel educativo, a qué nivel llegaron ellos (jóvenes 22-30 que corresiden con el jefe, dos épocas). Asociación descriptiva, los independizados no aparecen.',
  movilidad_matriz_educacion_2018_2025: 'La misma matriz jefe-a-hijos, solo 2018-2025, en formato de matriz de transición.',
  censo_analfabetismo_2007_2017: 'De cada 100 personas censadas que respondieron, cuántas no saben leer ni escribir. Incluye niños en edad de aprender, por eso es mayor que la cifra oficial de adultos 15+ (7.1% en 2007).',
  censo_educacion_1981_2017: 'De cada 100 personas censadas, cuántas alcanzaron cada nivel educativo, comparado a través de cuatro censos (incluye a los niños, por eso no coincide con las cifras de adultos 15+).',
  censo_lengua_materna_1981_2017: 'La lengua con la que cada peruano aprendió a hablar, censo a censo: el retroceso y la resistencia del quechua y el aimara.',
  censo_urbanizacion_1993_2017: 'Qué porcentaje del país vive en zonas urbanas, según los tres últimos censos.',
  censo_urbanizacion_departamento: 'La urbanización de cada departamento en los censos de 1993, 2007 y 2017.',
  censo_lengua_departamento: 'Qué porcentaje de cada departamento aprendió a hablar en una lengua originaria, censo a censo desde 1981.',
}
Object.assign(DESC, CENSOS)

const PREFIX = [
  ['panel_pobreza_dinamica', 'De los hogares seguidos durante 5 años, cuántos fueron pobres siempre (crónica), a veces (transitoria) o nunca. La pobreza peruana es sobre todo rotacional.'],
  ['panel_pobreza_transicion', 'De un año al siguiente, qué porcentaje de hogares entró a la pobreza y qué porcentaje salió.'],
  ['panel_movilidad_quintil', 'Si divides los hogares en 5 escalones de ingreso, esta matriz muestra a cuál escalón llegaron 5 años después.'],
  ['panel_informalidad', 'Siguiendo a los mismos trabajadores 5 años: quiénes fueron siempre informales, siempre formales, o cambiaron.'],
  ['panel_seguro', 'Siguiendo a los mismos hogares 5 años: quiénes ganaron o perdieron seguro de salud.'],
]

export function descFor(table) {
  if (DESC[table]) return DESC[table]
  for (const [p, d] of PREFIX) {
    if (table.startsWith(p)) return d
  }
  return null
}
