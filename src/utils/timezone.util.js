/**
 * Timezone Utility
 * Manejo centralizado de fechas y horarios en timezone de Nicaragua (America/Managua, UTC-6)
 */

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

// Extender dayjs con plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Timezone por defecto: Nicaragua (Centroamérica)
const DEFAULT_TIMEZONE = 'America/Managua';

/**
 * Retorna la fecha y hora actual en timezone de Nicaragua
 * @returns {dayjs.Dayjs} Fecha actual en America/Managua
 */
function getNow() {
    return dayjs().tz(DEFAULT_TIMEZONE);
}

/**
 * Convierte cualquier fecha a timezone de Nicaragua
 * @param {Date|string|dayjs.Dayjs} date - Fecha a convertir
 * @returns {dayjs.Dayjs} Fecha en America/Managua
 */
function toLocal(date) {
    return dayjs(date).tz(DEFAULT_TIMEZONE);
}

/**
 * Formatea una fecha en formato ISO 8601 con offset local
 * Ejemplo: "2026-01-25T23:15:39-06:00"
 * @param {Date|string|dayjs.Dayjs} date - Fecha a formatear (usar null para fecha actual)
 * @returns {string} Fecha en formato ISO con offset
 */
function toLocalISO(date = null) {
    const targetDate = date ? toLocal(date) : getNow();
    return targetDate.format();
}

/**
 * Formatea una fecha en formato YYYY-MM-DD (solo fecha)
 * @param {Date|string|dayjs.Dayjs} date - Fecha a formatear (usar null para fecha actual)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
function formatDate(date = null) {
    const targetDate = date ? toLocal(date) : getNow();
    return targetDate.format('YYYY-MM-DD');
}

/**
 * Formatea una fecha en formato completo legible
 * Ejemplo: "25 de Enero de 2026, 11:15 PM"
 * @param {Date|string|dayjs.Dayjs} date - Fecha a formatear (usar null para fecha actual)
 * @returns {string} Fecha formateada en español
 */
function formatDateTime(date = null) {
    const targetDate = date ? toLocal(date) : getNow();
    return targetDate.format('DD [de] MMMM [de] YYYY, h:mm A');
}

/**
 * Formatea una fecha para folios u otros identificadores
 * Ejemplo: "20260125"
 * @param {Date|string|dayjs.Dayjs} date - Fecha a formatear (usar null para fecha actual)
 * @returns {string} Fecha en formato YYYYMMDD
 */
function formatDateForFolio(date = null) {
    const targetDate = date ? toLocal(date) : getNow();
    return targetDate.format('YYYYMMDD');
}

/**
 * Obtiene el inicio del día actual en Nicaragua (00:00:00)
 * @returns {dayjs.Dayjs} Inicio del día en America/Managua
 */
function getStartOfDay(date = null) {
    const targetDate = date ? toLocal(date) : getNow();
    return targetDate.startOf('day');
}

/**
 * Obtiene el fin del día actual en Nicaragua (23:59:59)
 * @returns {dayjs.Dayjs} Fin del día en America/Managua
 */
function getEndOfDay(date = null) {
    const targetDate = date ? toLocal(date) : getNow();
    return targetDate.endOf('day');
}

/**
 * Retorna información del timezone configurado
 * @returns {Object} Información del timezone
 */
function getTimezoneInfo() {
    const now = getNow();
    return {
        timezone: DEFAULT_TIMEZONE,
        offset: now.format('Z'),
        offsetMinutes: now.utcOffset(),
        name: 'Hora de Nicaragua (CST)',
        current: now.format()
    };
}

module.exports = {
    getNow,
    toLocal,
    toLocalISO,
    formatDate,
    formatDateTime,
    formatDateForFolio,
    getStartOfDay,
    getEndOfDay,
    getTimezoneInfo,
    DEFAULT_TIMEZONE
};
