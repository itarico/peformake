"""Cena em Manim (teste, 23/11/2026): a conta da missão 2. A barra de R$ 449,90 perde a fatia do imposto e a da loja,
sobra a parte da empresa (40 a 50 %), que ainda paga equipe, servidores e desenvolvimento.
Sincronizada com a voz: trecho 303,53 s a 319,53 s de palavras.json (tempos abaixo são relativos ao início).
Fatias pelo cenário do meio (imposto 36 %, loja 30 % do resto); os rótulos mostram as faixas reais.
Render: manim -qh --fps 24 -r 1920,1080 manim_conta.py Conta"""
import pathlib, manimpango
from manim import *

FONTES = pathlib.Path(r'C:\Claude\canal-youtube\gta6\midia\fontes')
manimpango.register_font(str(FONTES / 'Anton-400.ttf'))
FUNDO, LARANJA, ROSA, CREME, VERDE, ESCURO = '#241219', '#FF6A2B', '#FF3D7F', '#F1E6D2', '#4BE38A', '#160A10'
config.background_color = FUNDO
DUR = 16.0
# momentos (s, relativos a 303,53): conta, preço, "chegam" (fatias), valor, %, equipe, servidores, desenvolvimento
T_PRECO, T_FATIAS, T_VALOR, T_PCT, T_EQ, T_SERV, T_DEV = 1.0, 3.16, 4.9, 8.76, 11.6, 12.47, 13.9


def T(txt, tam, cor=CREME):
    return Text(txt, font='Anton', font_size=tam, color=cor)


class Conta(Scene):
    def construct(self):
        L, H, X0, Y = 13.0, 1.3, -6.5, 0.2
        def seg(a, b, cor):
            return Rectangle(width=(b - a) * L, height=H, fill_color=cor, fill_opacity=1, stroke_width=0).move_to(
                [X0 + (a + b) / 2 * L, Y, 0])
        imp, loja, emp = seg(0, .36, ROSA), seg(.36, .552, LARANJA), seg(.552, 1, CREME)
        sombra = Rectangle(width=L, height=H, fill_color=ESCURO, fill_opacity=1, stroke_width=0).move_to([X0 + L / 2 + .12, Y - .12, 0])
        total = T('R$ 449,90', 150).next_to(sombra, UP, buff=.5)
        t = 0
        def ate(x):
            nonlocal t
            if x > t: self.wait(x - t); t = x
        # 0: a barra inteira (cor única, creme) se estende da esquerda
        barra = VGroup(imp.copy().set_fill(CREME), loja.copy().set_fill(CREME), emp)
        self.add(sombra); self.play(GrowFromEdge(barra, LEFT), run_time=.5, rate_func=rate_functions.ease_out_cubic); t = .5
        ate(T_PRECO); self.play(FadeIn(total, shift=DOWN * .3), run_time=.25); t += .25
        # "chegam na sua empresa": cai a fatia do imposto, depois a da loja
        ate(T_FATIAS)
        imp.set_z_index(2); loja.set_z_index(2)
        self.remove(barra[0], barra[1]); self.add(imp, loja)
        r_imp = T('IMPOSTO', 64, ROSA).next_to(imp, DOWN, buff=1.6)
        self.play(imp.animate.shift(DOWN * 1.9).rotate(-.12), FadeIn(r_imp), run_time=.35, rate_func=rate_functions.ease_in_quad); t += .35
        r_loja = T('LOJA', 64, LARANJA).next_to(loja, DOWN, buff=1.6)
        self.play(loja.animate.shift(DOWN * 1.9).rotate(.1), FadeIn(r_loja), run_time=.35, rate_func=rate_functions.ease_in_quad); t += .35
        self.play(emp.animate.set_fill(VERDE), total.animate.set_opacity(.35), run_time=.25); t += .25
        # valor da empresa e a porcentagem
        ate(T_VALOR)
        v = T('R$ 177 A 227', 96, VERDE).next_to(emp, UP, buff=.45)
        self.play(FadeOut(total), FadeIn(v, shift=UP * .2), run_time=.3); t += .3
        ate(T_PCT)
        pct = T('40 A 50%', 210, CREME).move_to([0, -2.6, 0])
        self.play(FadeOut(r_imp), FadeOut(r_loja), imp.animate.set_opacity(.25), loja.animate.set_opacity(.25),
                  FadeIn(pct, scale=1.3), run_time=.25); t += .25
        # "e daí ainda sai": a parte verde se divide (sem valores: não são públicos)
        ate(T_EQ - .4)
        self.play(FadeOut(pct), FadeOut(imp), FadeOut(loja), FadeOut(sombra),
                  emp.animate.stretch_to_fit_width(L).move_to([0, Y, 0]), v.animate.move_to([0, Y + H / 2 + .9, 0]), run_time=.35); t += .35
        x_a, x_b = X0, X0 + L
        cortes = [x_a + (x_b - x_a) * k for k in (1 / 3, 2 / 3)]
        for k, (tt, nome) in enumerate([(T_EQ, 'EQUIPE'), (T_SERV, 'SERVIDORES'), (T_DEV, 'DESENVOLVIMENTO')]):
            ate(tt)
            a = x_a if k == 0 else cortes[k - 1]; b = cortes[k] if k < 2 else x_b
            lin = Line([a, Y - H / 2 - .1, 0], [a, Y + H / 2 + .1, 0], color=FUNDO, stroke_width=14) if k else VMobject()
            rot = T(nome, 46, CREME).move_to([(a + b) / 2, Y - 1.25, 0])
            self.play(FadeIn(lin), FadeIn(rot, shift=UP * .2), run_time=.25); t += .25
        ate(DUR)
