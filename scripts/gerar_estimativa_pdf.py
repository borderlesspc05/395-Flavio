# -*- coding: utf-8 -*-
"""Gera PDF de estimativa Magnus Mind (395-flavio) no formato da Estimativa 437."""

from pathlib import Path
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "Estimativa_395-MagnusMind.pdf"

FONT_REG = "Arial"
FONT_BOLD = "Arial-Bold"


def register_fonts():
    fonts_dir = Path("C:/Windows/Fonts")
    pdfmetrics.registerFont(TTFont(FONT_REG, str(fonts_dir / "arial.ttf")))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, str(fonts_dir / "arialbd.ttf")))


def build_styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=base["Heading1"],
            fontName=FONT_BOLD,
            fontSize=14,
            leading=18,
            spaceAfter=8,
            textColor=colors.HexColor("#1a1a2e"),
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=10,
            leading=14,
            spaceAfter=14,
            textColor=colors.HexColor("#333333"),
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=11,
            leading=14,
            spaceBefore=12,
            spaceAfter=6,
            textColor=colors.HexColor("#2F3A4C"),
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=9.5,
            leading=13,
            spaceAfter=6,
            alignment=TA_LEFT,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=9,
            leading=12,
            leftIndent=14,
            bulletIndent=0,
            spaceAfter=3,
        ),
        "label": ParagraphStyle(
            "label",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=9.5,
            leading=13,
            spaceBefore=4,
            spaceAfter=2,
            textColor=colors.HexColor("#2F3A4C"),
        ),
        "estimate": ParagraphStyle(
            "estimate",
            parent=base["Normal"],
            fontName=FONT_BOLD,
            fontSize=10,
            leading=14,
            spaceBefore=4,
            spaceAfter=8,
            textColor=colors.HexColor("#1a1a2e"),
        ),
        "summary_title": ParagraphStyle(
            "summary_title",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=16,
            spaceBefore=16,
            spaceAfter=8,
            textColor=colors.HexColor("#2F3A4C"),
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer",
            parent=base["Normal"],
            fontName=FONT_REG,
            fontSize=8.5,
            leading=12,
            spaceAfter=6,
            textColor=colors.HexColor("#555555"),
        ),
    }


def section_block(story, styles, num, title, intro, bullets, mvp_days, robust_days):
    story.append(Paragraph(f"{num}- {title}", styles["h2"]))
    story.append(Paragraph("🔹 <b>Explicação inicial:</b>", styles["label"]))
    story.append(Paragraph(intro, styles["body"]))
    story.append(Paragraph("🔹 <b>Detalhamento técnico:</b>", styles["label"]))
    for b in bullets:
        story.append(Paragraph(f"&bull; {b}", styles["bullet"]))
    story.append(Paragraph(f"☑ MVP: {mvp_days} dias", styles["estimate"]))
    story.append(Paragraph(f"✅ Robusta: {robust_days} dias", styles["estimate"]))


def main():
    register_fonts()
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Estimativa 395 - Magnus Mind",
        author="Borderless",
    )
    story = []

    story.append(
        Paragraph(
            "Estimativa em relação ao escopo do projeto",
            styles["title"],
        )
    )
    story.append(
        Paragraph(
            '(Versão "MVP" e versão "Robusta" com base no escopo gerado a partir das '
            "referências do projeto Magnus Mind - People Sprint / MM People Sprint 90+)",
            styles["subtitle"],
        )
    )

    story.append(Paragraph("1. Visão Geral", styles["h2"]))
    story.append(
        Paragraph(
            "Com base na estrutura já existente da plataforma Magnus Mind - frontend React "
            "(Vite), backend Express no Render, autenticação Firebase, jornada Magnus Waves "
            "em quatro ondas e integração Open Router com RAG - esta etapa contempla a "
            "consolidação do produto People Sprint em ambiente de produção (Netlify + Render), "
            "refinamento das ondas do fluxo Miro e homologação ponta a ponta até a jornada "
            "completa operar com estabilidade aceitável para usuários reais.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "A estimativa considera o código atual no repositório 395-flavio, incluindo "
            "normalização da API Render (apiNormalize), Magnus Waves Progress, Human-to-Business "
            "Canvas, Consultoria IA, Objetivos, Equipe, Relatórios e Histórico, sem reimplementar "
            "do zero a autenticação Firebase nem o motor de chat.",
            styles["body"],
        )
    )

    section_block(
        story,
        styles,
        2,
        "Deploy Netlify, Render e Firebase em Produção",
        "Publicar o painel web em HTTPS no Netlify e garantir que o frontend aponte corretamente "
        "para a API no Render, com variáveis de ambiente, CORS e health check validados.",
        [
            "Configuração de VITE_API_BASE_URL e VITE_FIREBASE_* no Netlify",
            "Web Service Render com Root Directory server e /api/health em JSON",
            "FIREBASE_PRIVATE_KEY e credenciais Admin no Render (formato uma linha)",
            "CORS_ORIGIN incluindo domínio Netlify e localhost",
            "Authorized domains no Firebase Console",
            "Timeouts 90s/120s para cold start do Render Free",
            "Rebuild e smoke-test do export web (dist)",
        ],
        2,
        3,
    )

    section_block(
        story,
        styles,
        3,
        "Onda 1 - Diagnóstico / Human-to-Business Canvas",
        "Consolidar o canvas de diagnóstico (etapas 1.1 a 1.5) com persistência Firestore, "
        "gate para ondas seguintes e alinhamento visual ao board Miro.",
        [
            "Formulário inicial com badges Decoding, Gap Scan, System Scan, Team Scan, Solution Pick",
            "Persistência em initialForms e leitura no dashboard",
            "Mapa de estágios do negócio e descrições por fase",
            "Banner/gate quando diagnóstico incompleto",
            "Validação de campos obrigatórios e estados vazios",
            "Copy e UX alinhados ao manifesto People Sprint",
        ],
        3,
        4,
    )

    section_block(
        story,
        styles,
        4,
        "Onda 2 - Design / MM Blueprint e Consultoria IA",
        "Garantir que o chat de consultoria estratégica funcione em produção com histórico, "
        "modelos, RAG e sugestões de objetivos integradas ao fluxo Blueprint.",
        [
            "Chat Open Router + RAG + busca web opcional (Serper/Tavily)",
            "Normalização de respostas Render (conversation, messages, reply)",
            "Histórico de conversas e seleção de modelos",
            "BlueprintConfigPage e fluxo Outcome Forge / Build / Impact Evaluation",
            "Sugestões de objetivos a partir do contexto do chat",
            "Tratamento de erros, retry e layout responsivo (drawer histórico)",
        ],
        3,
        4,
    )

    section_block(
        story,
        styles,
        5,
        "Onda 3 - Difusão / Objetivos, Equipe e Follow-up",
        "Operacionalizar Make the Move com CRUD de objetivos, gestão de equipe e "
        "acompanhamento de prazos e responsáveis.",
        [
            "Objetivos estratégicos: CRUD, filtros, prioridades, export CSV",
            "Integração sugestões IA e ações rápidas no dashboard",
            "Minha equipe: membros, performance, habilidades",
            "Histórico de atividades com datas relativas",
            "Recomendações dinâmicas no hub (objetivos em aberto)",
            "Navegação numerada por onda no menu lateral",
        ],
        3,
        4,
    )

    section_block(
        story,
        styles,
        6,
        "Onda 4 - Domínio / MID, Relatórios e Loop Contínuo",
        "Entregar o Magnus Intelligence Dashboard com relatórios consolidados, "
        "estatísticas Kirkpatrick 4 e retorno ao diagnóstico quando necessário.",
        [
            "Geração e visualização de relatórios via API",
            "Normalização conteúdo, resumo e stats (apiNormalize)",
            "Cards de estatísticas no dashboard (objetivos, equipe, relatórios)",
            "Mensagem de loop contínuo (retomar passo 1 / subir de nível)",
            "Atividade recente e integração com Firebase Analytics",
            "Estados de carregamento e vazios em todas as telas MID",
        ],
        2,
        3,
    )

    story.append(PageBreak())

    section_block(
        story,
        styles,
        7,
        "Homologação Ponta a Ponta e Entrega",
        "Executar validação final do sistema em produção com perfis reais e publicação "
        "definitiva da stack operacional.",
        [
            "Testes E2E de login Firebase e jornada completa (4 ondas)",
            "Validação conta demo e fluxo Formulário → IA → Objetivos → Relatórios",
            "Correções de regressão no frontend web",
            "Checklist de aceite (CHECKLIST.md) com instalação piloto",
            "Redeploy Netlify e restart/manual deploy Render",
            "Suporte pós-go-live na versão robusta",
        ],
        1,
        2,
    )

    story.append(Paragraph("📌 Estimativas Gerais", styles["summary_title"]))
    story.append(Paragraph("Estimativa MVP", styles["h2"]))
    story.append(Paragraph("<b>14 dias</b>", styles["estimate"]))
    story.append(
        Paragraph(
            "Contempla:",
            styles["label"],
        )
    )
    for item in [
        "Deploy Netlify + Render + Firebase operacional",
        "Onda 1 - Human-to-Business Canvas completo com gate",
        "Onda 2 - Consultoria IA e MM Blueprint em produção",
        "Onda 3 - Objetivos, equipe e follow-up integrados ao hub",
        "Onda 4 - Relatórios MID e loop contínuo",
        "Homologação E2E e redeploy final",
    ]:
        story.append(Paragraph(f"&bull; {item}", styles["bullet"]))

    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("Estimativa Robusta", styles["h2"]))
    story.append(Paragraph("<b>20 dias</b>", styles["estimate"]))
    story.append(Paragraph("Contempla:", styles["label"]))
    for item in [
        "Todos os fluxos do MVP refinados",
        "Tratamento ampliado de falhas de API, cold start Render e chat IA",
        "Blueprint Config e prompts RAG revisados para producao",
        "Responsividade e acessibilidade revisadas em todas as ondas",
        "Checklist de aceite ampliado (Miro + manifesto)",
        "Ajustes pós-homologação e documentação operacional (DEPLOY.md)",
        "Estabilização operacional da primeira semana em produção",
    ]:
        story.append(Paragraph(f"&bull; {item}", styles["bullet"]))

    story.append(Spacer(1, 12 * mm))
    story.append(Paragraph("Disclaimer", styles["summary_title"]))
    story.append(
        Paragraph(
            "Todos os passos são, claro, estimados, neste planejamento, mas pensando com "
            "margens para resolução de potenciais bugs, dificuldades que podem surgir em cada "
            "etapa de desenvolvimento, pelo fato do desenvolvimento de software em si já ser um "
            "serviço complexo.",
            styles["disclaimer"],
        )
    )
    story.append(
        Paragraph(
            "Claro, apenas sugestões, pois a decisão sempre será de vocês e seguiremos buscando "
            "agregar o máximo possível dentro dela.",
            styles["disclaimer"],
        )
    )
    story.append(
        Paragraph(
            "Agradecemos a gentileza, e estamos à disposição.",
            styles["disclaimer"],
        )
    )

    doc.build(story)
    print(f"PDF gerado: {OUTPUT}")


if __name__ == "__main__":
    main()
