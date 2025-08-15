import { useEffect } from 'react';
import { AgentList } from '@/components/agents/AgentList';
import { useAgentStore } from '@/store/agentStore';

export default function Agents() {
  const { fetchAgents } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return <AgentList />;
}