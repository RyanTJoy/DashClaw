import { Badge } from '../../components/ui/Badge';
import { timeAgo } from './helpers';
import MarkdownBody from './MarkdownBody';

export default function DocDetail({ doc }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-1">{doc.name}</h4>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="info" size="xs">v{doc.version}</Badge>
        <span className="text-xs text-zinc-500">by {doc.last_edited_by || doc.created_by}</span>
      </div>
      <div className="bg-[rgba(255,255,255,0.02)] rounded-md p-3 mb-2 max-h-[400px] overflow-y-auto">
        <MarkdownBody content={doc.content} />
      </div>
      <div className="text-xs text-zinc-600">
        Created {new Date(doc.created_at).toLocaleString()}
        {doc.updated_at !== doc.created_at && ` · Updated ${timeAgo(doc.updated_at)}`}
      </div>
    </div>
  );
}
