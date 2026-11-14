// Shared acceptance predicate: an applied action alone is never a completed turn.
export function assertTerminal(record,expected) {
  if(!record||record.status!==expected)throw Error(`terminal status ${record?.status??'missing'}; expected ${expected}`);
  if(expected==='complete'&&(!Number.isSafeInteger(record.usage?.total_tokens)||record.usage.total_tokens<=0))throw Error('missing measured model usage');
  if(expected==='refused'&&record.usage?.total_tokens!==0)throw Error('refusal consumed model tokens');
}
