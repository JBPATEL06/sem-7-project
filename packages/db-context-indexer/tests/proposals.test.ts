import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createMcpServer } from '../src/mcp/server.ts';
import { buildIndex } from '../src/core/indexBuilder.js';
import { addProposalRecord, approveProposal, rejectProposal } from '@ai-manager/core';

const dbPath = path.resolve('.dbci/index_proposal_test.sqlite');
const rootDir = path.resolve('.');
const testFilePath = path.resolve('.dbci/proposal_code_test_target.txt');

beforeAll(async () => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  await buildIndex({ rootDir, dbPath, full: true });
  fs.writeFileSync(testFilePath, 'Original Code Line 1\nOriginal Code Line 2\n', 'utf8');
});

afterAll(() => {
  if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
});

describe('Item #3: dbci propose & Permission Enforcement Test Suite', () => {
  it('1. Submits code proposal and verifies pending status in SQLite & dbci_proposals MCP tool', async () => {
    const payload = JSON.stringify({
      filePath: '.dbci/proposal_code_test_target.txt',
      newContent: 'Original Code Line 1\nModifed Code Line 2 (AI Proposal)\n'
    });

    const proposal = await addProposalRecord(
      dbPath,
      'code',
      'file',
      '.dbci/proposal_code_test_target.txt',
      'Update test target code line 2',
      payload,
      'agent:antigravity'
    );

    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('pending');

    // Test MCP read-only dbci_proposals tool
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;
    const res = await tools.dbci_proposals.handler({ status: 'pending' }, {});
    const parsed = JSON.parse(res.content[0].text);

    expect(parsed.count).toBeGreaterThan(0);
    expect(parsed.note).toContain('Read-only proposal review tool for AI agents');
  });

  it('2. Approves code proposal, executes code write-back payload to disk, and updates status', async () => {
    const payload = JSON.stringify({
      filePath: '.dbci/proposal_code_test_target.txt',
      newContent: 'Original Code Line 1\nModifed Code Line 2 (AI Proposal)\n'
    });

    const proposal = await addProposalRecord(
      dbPath,
      'code',
      'file',
      '.dbci/proposal_code_test_target.txt',
      'Update test target code line 2 for approval',
      payload,
      'agent:antigravity'
    );

    const approveResult = await approveProposal(dbPath, proposal.id, 'human_admin', { rootDir });
    expect(approveResult.success).toBe(true);
    expect(approveResult.proposal?.status).toBe('approved');
    expect(approveResult.proposal?.reviewedBy).toBe('human_admin');

    // Verify code write-back payload executed to disk
    const diskContent = fs.readFileSync(testFilePath, 'utf8');
    expect(diskContent).toContain('Modifed Code Line 2 (AI Proposal)');
  });

  it('3. Rejects proposal with reason, retaining persistent audit history without deletion', async () => {
    const payload = JSON.stringify({ message: 'Proposed unsafe schema change' });
    const proposal = await addProposalRecord(
      dbPath,
      'discussion',
      'project',
      'root',
      'Unsafe schema change',
      payload,
      'agent:untrusted'
    );

    const rejectResult = await rejectProposal(dbPath, proposal.id, 'human_security_lead', 'Breaks schema backward compatibility');
    expect(rejectResult.success).toBe(true);
    expect(rejectResult.proposal?.status).toBe('rejected');
    expect(rejectResult.proposal?.reviewedBy).toBe('human_security_lead');
    expect(rejectResult.proposal?.rejectionReason).toBe('Breaks schema backward compatibility');

    // Verify rejected proposal is retained in MCP tool audit history
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;
    const res = await tools.dbci_proposals.handler({ status: 'rejected' }, {});
    const parsed = JSON.parse(res.content[0].text);

    const foundRejected = parsed.proposals.find((p: any) => p.id === proposal.id);
    expect(foundRejected).toBeDefined();
    expect(foundRejected.rejectionReason).toBe('Breaks schema backward compatibility');
  });
});
