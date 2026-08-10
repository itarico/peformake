import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SmartInputField } from './SmartInputField';
import { useAudiovisual } from './AudiovisualContext';
import {
  OBJETIVOS_ESTRATEGICOS,
  CANAIS_PUBLICACAO,
  DURACOES,
  TONS_EMOCIONAIS,
  ESTRATEGIAS_PERSUASIVAS,
  ESTAGIOS_FUNIL,
  ALL_ESTRUTURAS,
} from './constants';
import { Target, Users, Map, MonitorPlay, Clock, Palette, Brain, Layout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ParametersSectionProps {
  disabled?: boolean;
}

export function ParametersSection({ disabled }: ParametersSectionProps) {
  const { 
    parameters, 
    setParameter, 
    generateWithAI, 
    searchWithFirecrawl, 
    autoDecide,
    strategicContext 
  } = useAudiovisual();

  const [selectedStructure, setSelectedStructure] = useState<string>('');

  const createAIHandler = (field: string, promptContext: string) => async () => {
    return await generateWithAI(field, `
      Baseado no contexto estratégico do cliente e no tema "${parameters.tema}",
      sugira ${promptContext}.
      Seja específico e relevante para o nicho.
    `);
  };

  const createFirecrawlHandler = (query: string) => async () => {
    return await searchWithFirecrawl(query);
  };

  const createAutoHandler = (field: string) => async () => {
    return await autoDecide(field, `
      Decida automaticamente a melhor opção para ${field} 
      considerando o tema "${parameters.tema}" e o contexto do cliente.
    `);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Parâmetros Estratégicos do Vídeo</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['objetivo', 'publico', 'canal']} className="space-y-2">
          {/* Objetivo Estratégico */}
          <AccordionItem value="objetivo" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Objetivo Estratégico</span>
                {parameters.objetivo && (
                  <Badge variant="secondary" className="ml-2">{parameters.objetivo}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Objetivo do Vídeo"
                description="Qual o principal objetivo deste vídeo?"
                value={parameters.objetivo}
                onChange={(v) => setParameter('objetivo', v)}
                options={OBJETIVOS_ESTRATEGICOS}
                onGenerateWithAI={createAIHandler('objetivo', 'o melhor objetivo estratégico')}
                onSearchWithFirecrawl={createFirecrawlHandler('melhores objetivos vídeos marketing digital')}
                onAutoDecide={createAutoHandler('objetivo')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Público-alvo */}
          <AccordionItem value="publico" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Público-alvo</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Público-alvo"
                description="Nicho, perfil comportamental, dores, objeções e desejos"
                value={parameters.publicoAlvo}
                onChange={(v) => setParameter('publicoAlvo', v)}
                placeholder="Descreva o público: nicho, subnicho, nível de consciência, principais dores e objeções..."
                onGenerateWithAI={createAIHandler('publicoAlvo', 'uma descrição detalhada do público-alvo ideal')}
                onSearchWithFirecrawl={createFirecrawlHandler('perfil consumidor + dores e desejos do público')}
                onAutoDecide={createAutoHandler('publicoAlvo')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Estágio da Jornada */}
          <AccordionItem value="estagio" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                <span className="font-medium">Estágio da Jornada/Funil</span>
                {parameters.estagioFunil && (
                  <Badge variant="secondary" className="ml-2">{parameters.estagioFunil}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Estágio do Funil"
                description="Em qual momento da jornada o público está?"
                value={parameters.estagioFunil}
                onChange={(v) => setParameter('estagioFunil', v)}
                options={ESTAGIOS_FUNIL}
                onGenerateWithAI={createAIHandler('estagioFunil', 'o estágio ideal do funil para este conteúdo')}
                onAutoDecide={createAutoHandler('estagioFunil')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Canal de Publicação */}
          <AccordionItem value="canal" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <MonitorPlay className="h-5 w-5 text-primary" />
                <span className="font-medium">Canal de Publicação</span>
                {parameters.canal && (
                  <Badge variant="secondary" className="ml-2">{parameters.canal}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Canais"
                description="Onde o vídeo será publicado?"
                value={parameters.canal}
                onChange={(v) => setParameter('canal', v)}
                options={CANAIS_PUBLICACAO}
                multiSelect
                onGenerateWithAI={createAIHandler('canal', 'os melhores canais para este tipo de conteúdo')}
                onAutoDecide={createAutoHandler('canal')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Duração */}
          <AccordionItem value="duracao" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">Duração do Vídeo</span>
                {parameters.duracao && (
                  <Badge variant="secondary" className="ml-2">{parameters.duracao}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Duração"
                description="Quanto tempo deve ter o vídeo?"
                value={parameters.duracao}
                onChange={(v) => setParameter('duracao', v)}
                options={DURACOES}
                onGenerateWithAI={createAIHandler('duracao', 'a duração ideal baseada no objetivo e canal')}
                onAutoDecide={createAutoHandler('duracao')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Tom Emocional */}
          <AccordionItem value="tom" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <span className="font-medium">Tom Emocional e Linguagem</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Tom"
                description="Qual o tom de voz e energia do vídeo?"
                value={parameters.tomEmocional}
                onChange={(v) => setParameter('tomEmocional', v)}
                options={TONS_EMOCIONAIS}
                multiSelect
                onGenerateWithAI={createAIHandler('tomEmocional', 'os melhores tons emocionais para o tema e objetivo')}
                onSearchWithFirecrawl={createFirecrawlHandler('tons de voz que convertem + tendências comunicação')}
                onAutoDecide={createAutoHandler('tomEmocional')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Estratégias Persuasivas */}
          <AccordionItem value="estrategias" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-medium">Estratégias Persuasivas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <SmartInputField
                label="Estratégias"
                description="Quais técnicas de persuasão utilizar?"
                value={parameters.estrategiasPersuasivas}
                onChange={(v) => setParameter('estrategiasPersuasivas', v)}
                options={ESTRATEGIAS_PERSUASIVAS}
                multiSelect
                onGenerateWithAI={createAIHandler('estrategiasPersuasivas', 'as melhores estratégias persuasivas para este contexto')}
                onSearchWithFirecrawl={createFirecrawlHandler('técnicas persuasão vídeos + neuromarketing conteúdo')}
                onAutoDecide={createAutoHandler('estrategiasPersuasivas')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Estrutura Narrativa */}
          <AccordionItem value="estrutura" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2">
                <Layout className="h-5 w-5 text-primary" />
                <span className="font-medium">Estrutura Narrativa</span>
                {parameters.estruturaNarrativa && (
                  <Badge variant="secondary" className="ml-2">{parameters.estruturaNarrativa}</Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              {ALL_ESTRUTURAS.map((category) => (
                <div key={category.category} className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{category.category}</p>
                  <div className="grid gap-2">
                    {category.structures.map((struct) => (
                      <div
                        key={struct.name}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50",
                          parameters.estruturaNarrativa === struct.name && "border-primary bg-primary/10"
                        )}
                        onClick={() => !disabled && setParameter('estruturaNarrativa', struct.name)}
                      >
                        <p className="font-medium text-sm">{struct.name}</p>
                        <p className="text-xs text-muted-foreground">{struct.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <SmartInputField
                label="Ou crie sua estrutura"
                value={parameters.estruturaNarrativa}
                onChange={(v) => setParameter('estruturaNarrativa', v)}
                onGenerateWithAI={createAIHandler('estruturaNarrativa', 'a estrutura narrativa ideal para este vídeo')}
                onAutoDecide={createAutoHandler('estruturaNarrativa')}
                disabled={disabled}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
