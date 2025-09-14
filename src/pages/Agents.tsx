import { useEffect } from 'react';
import { AgentList } from '@/components/agents/AgentList';
import { useAgentStore } from '@/store/agentStore';

export default function Agents() {
  console.log('🚀 [AGENTS PAGE] Componente Agents renderizado');
  const { fetchAgents } = useAgentStore();

  useEffect(() => {
    console.log('🔄 [AGENTS PAGE] useEffect ejecutado, llamando fetchAgents...');
    fetchAgents();
  }, [fetchAgents]);

  console.log('📄 [AGENTS PAGE] Retornando AgentList component');
  return <AgentList />;
}