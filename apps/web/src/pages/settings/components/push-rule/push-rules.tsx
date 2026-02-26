import { useState } from 'react';
import { bindServices, useService } from '@rabjs/react';
import { PushRulesList } from './push-rules-list';
import { PushRuleFormModal } from './push-rule-form-modal';
import { PushRuleService } from './push-rule.service';
import type { PushRuleDto } from '@aimo/dto';

export const PushRulesSettings = bindServices(() => {
  const pushRuleService = useService(PushRuleService);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRule, setEditRule] = useState<PushRuleDto | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddRule = () => {
    setEditRule(null);
    setIsModalOpen(true);
  };

  const handleEditRule = (rule: PushRuleDto) => {
    setEditRule(rule);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    // Refresh the list
    pushRuleService.fetchRules();
    setRefreshKey((k) => k + 1);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditRule(null);
  };

  return (
    <div key={refreshKey}>
      <PushRulesList onAddRule={handleAddRule} onEditRule={handleEditRule} />
      <PushRuleFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        editRule={editRule}
      />
    </div>
  );
}, [PushRuleService]);
