import { describe, expect, it } from 'vitest'
import { parseCsv, parseDate, parseMoney, parseOfx, parseStatement, ruleHint, importSummary } from './statement'

describe('parseMoney', () => {
  it('lê formato brasileiro', () => expect(parseMoney('R$ 1.234,56')).toBe(1234.56))
  it('lê formato americano', () => expect(parseMoney('-1234.56')).toBe(-1234.56))
  it('lê parênteses como negativo', () => expect(parseMoney('(50,00)')).toBe(-50))
  it('lê sinal no fim', () => expect(parseMoney('80,00-')).toBe(-80))
  it('recusa texto', () => expect(parseMoney('abc')).toBeNull())
})

describe('parseDate', () => {
  it('dd/mm/aaaa', () => expect(parseDate('05/11/2026')).toBe('2026-11-05'))
  it('OFX', () => expect(parseDate('20261105120000[-3:BRT]')).toBe('2026-11-05'))
  it('ISO', () => expect(parseDate('2026-11-05')).toBe('2026-11-05'))
  it('recusa data impossível', () => expect(parseDate('31/02/2026')).toBeNull())
})

const OFX = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261103<TRNAMT>1500.00<FITID>A1<MEMO>PIX RECEBIDO BRIO BURGUER
</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261104<TRNAMT>-89.90<FITID>A2<NAME>CANVA
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

describe('parseOfx', () => {
  it('lê lançamentos com id do banco', () => {
    expect(parseOfx(OFX)).toEqual([
      { date: '2026-11-03', description: 'PIX RECEBIDO BRIO BURGUER', amount: 1500, external_id: 'ofx:A1' },
      { date: '2026-11-04', description: 'CANVA', amount: -89.9, external_id: 'ofx:A2' },
    ])
  })
  it('detecta OFX pelo conteúdo', () => expect(parseStatement('extrato.txt', OFX)).toHaveLength(2))
})

describe('parseCsv', () => {
  it('lê coluna única de valor com ;', () => {
    const rows = parseCsv('Data;Descrição;Valor\n03/11/2026;Pix recebido;1.500,00\n04/11/2026;Canva;-89,90\n')
    expect(rows.map((r) => [r.date, r.amount])).toEqual([['2026-11-03', 1500], ['2026-11-04', -89.9]])
  })
  it('lê entrada e saída separadas', () => {
    const rows = parseCsv('data,historico,credito,debito\n2026-11-03,Pix,"1,500.00",\n2026-11-04,Canva,,89.90\n')
    expect(rows.map((r) => r.amount)).toEqual([1500, -89.9])
  })
  it('linhas iguais ganham ids diferentes, e o mesmo arquivo gera os mesmos ids', () => {
    const csv = 'Data;Descrição;Valor\n03/11/2026;Tarifa;-2,00\n03/11/2026;Tarifa;-2,00\n'
    const a = parseCsv(csv)
    expect(a[0]!.external_id).not.toBe(a[1]!.external_id)
    expect(parseCsv(csv).map((r) => r.external_id)).toEqual(a.map((r) => r.external_id))
  })
  it('sem colunas reconhecidas devolve vazio', () => expect(parseCsv('a;b\n1;2')).toEqual([]))
})

describe('ruleHint', () => {
  it('tira números e acentos', () => expect(ruleHint('PIX RECEBIDO 03/11 Brió 123')).toBe('pix recebido brio'))
})

describe('importSummary (extrato sem duplicar)', () => {
  it('mostra o que foi conciliado', () => {
    expect(importSummary({ added: 2, skipped: 1, uncategorized: 0, matched: 1, invoices_paid: 1, transfers: 1 }))
      .toBe('2 lançamentos novos · 1 fatura quitada pelo extrato · 1 já estava no Caixa (conferido, sem duplicar) · 1 transferência do Asaas (não é receita nova) · 1 já importado antes.')
  })
  it('funciona com o retorno antigo', () => {
    expect(importSummary({ added: 1, skipped: 0, uncategorized: 1 })).toBe('1 lançamento novo. 1 sem categoria: classifique na lista e o sistema aprende.')
  })
})
