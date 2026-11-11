import { describe, expect, it } from 'vitest'
import { clientMessage, consultLink, readyNotices, rowAction, sortRows, statusChip, waLink, type ConsultRow } from './consultRules'
import { consultHtml } from './consultPrint'

const row = (p: Partial<ConsultRow>): ConsultRow => ({
  client_id: 'c1', name: 'Will motos', logo_path: null, segment: null, document: null, instagram: null, website: null,
  status: 'na_fila', stage: 'research', redo_section: null, error: null, updated_at: null, finished_at: null, suggestions: 0, can_generate: true, direction: null, ...p,
})

describe('situação da consultoria', () => {
  it('sem documento pede CNPJ; com 11 dígitos guardados fala em CPF', () => {
    expect(statusChip(row({ status: 'falta_dados' })).label).toBe('Falta CNPJ')
    expect(statusChip(row({ status: 'falta_dados', document: '123' })).label).toBe('Falta CNPJ')
    expect(statusChip(row({ status: 'falta_dados', document: '12345678901' })).label).toBe('Falta CPF')
  })
  it('gerando mostra a etapa', () => {
    expect(statusChip(row({ status: 'gerando', stage: 'plano' })).sub).toBe('montando o plano de ação')
  })
  it('limite do mês e erro aparecem como problema', () => {
    expect(statusChip(row({ status: 'limite' })).label).toBe('Limite do mês atingido')
    expect(statusChip(row({ status: 'erro' })).tone).toBe('bad')
  })
})

describe('ação de 1 toque', () => {
  it('falta dado → informar; pronto → revisar; aprovado → abrir', () => {
    expect(rowAction(row({ status: 'falta_dados' })).kind).toBe('dados')
    expect(rowAction(row({ status: 'pronto' })).label).toBe('Revisar')
    expect(rowAction(row({ status: 'aprovado' })).kind).toBe('abrir')
  })
  it('já gerou hoje: espera até amanhã (1 por dia)', () => {
    expect(rowAction(row({ status: 'na_fila', can_generate: false })).label).toBe('Amanhã')
    expect(rowAction(row({ status: 'erro', can_generate: false })).kind).toBe('aguardar')
    expect(rowAction(row({ status: 'erro', can_generate: true })).kind).toBe('gerar')
  })
})

describe('ordem e avisos', () => {
  it('pronto para revisar e falta dado vêm primeiro', () => {
    const out = sortRows([row({ client_id: 'a', name: 'A', status: 'enviado' }), row({ client_id: 'b', name: 'B', status: 'falta_dados' }), row({ client_id: 'c', name: 'C', status: 'pronto' })])
    expect(out.map((r) => r.client_id)).toEqual(['c', 'b', 'a'])
  })
  it('Bete e Início: só os prontos, com link para o cliente exato', () => {
    const n = readyNotices([row({ status: 'pronto', name: ' Will motos ', finished_at: '2026-11-11T10:00:00Z' }), row({ client_id: 'x', status: 'aprovado' })])
    expect(n).toHaveLength(1)
    expect(n[0]!.title).toBe('Diagnóstico de Will motos pronto para revisar')
    expect(n[0]!.to).toBe(consultLink('c1'))
    expect(n[0]!.to).toBe('/estrategia/consultoria?cliente=c1')
  })
})

describe('envio (sempre por uma pessoa)', () => {
  it('mensagem cita o cliente e o primeiro passo', () => {
    const m = clientMessage('Will motos', 'Criar o Instagram')
    expect(m).toContain('Will motos')
    expect(m).toContain('Criar o Instagram')
    expect(m).not.toMatch(/agência/i)
  })
  it('wa.me com DDI 55 e sem telefone não gera link', () => {
    expect(waLink('(81) 98712-2050', 'oi')).toBe('https://wa.me/5581987122050?text=oi')
    expect(waLink(null, 'oi')).toBeNull()
  })
  it('PDF escapa HTML do texto da IA', () => {
    const html = consultHtml('<b>X</b>', { resumo: { titulo: 'A & B', decisoes: ['<script>'] } })
    expect(html).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(html).toContain('A &amp; B')
    expect(html).not.toContain('<script>')
  })
})
