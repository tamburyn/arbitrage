/**
 * Database types for the Arbitrage API
 * 
 * Podstawowe typy używane w definicjach DTO i modelach bazy danych.
 */

// Typ reprezentujący dane JSON z bazy danych
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Dodatkowe typy bazy danych mogą być dodane tutaj
export type DatabaseId = string;
export type Timestamp = string;