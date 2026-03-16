#!/usr/bin/env python3
"""
Unified Email Service for claude-projects
Consolidates all email functionality into a single, configurable service
"""

import os
import json
import base64
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json as _json

# Handle imports gracefully
try:
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build

    GMAIL_AVAILABLE = True
except ImportError:
    GMAIL_AVAILABLE = False

# Import Obsidian archiver
try:
    # Try relative import first (when used as a module)
    from .obsidian_email_archiver import archive_to_obsidian

    OBSIDIAN_ARCHIVER_AVAILABLE = True
except ImportError:
    try:
        # Try absolute import (when run directly)
        from obsidian_email_archiver import archive_to_obsidian

        OBSIDIAN_ARCHIVER_AVAILABLE = True
    except ImportError:
        OBSIDIAN_ARCHIVER_AVAILABLE = False
        print(
            "⚠️ Obsidian archiver not available - emails will not be archived to vault"
        )


@dataclass
class EmailConfig:
    """Email configuration"""

    sender_email: str
    sender_name: str
    recipient_email: str
    recipient_name: str
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    use_gmail_api: bool = True
    token_path: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "EmailConfig":
        return cls(**data)

    @classmethod
    def default(cls) -> "EmailConfig":
        """Default configuration for David"""
        return cls(
            sender_email="djm.claude.assistant@gmail.com",
            sender_name="Claude Assistant",
            recipient_email="thedavidmurray@gmail.com",
            recipient_name="David",
            use_gmail_api=True,
            token_path="/Users/djm/claude-projects/.mcp/gmail/token.json",
        )


@dataclass
class EmailTemplate:
    """Reusable email template"""

    name: str
    subject_template: str
    body_template: str
    variables: List[str]
    description: str = ""

    def render(self, **kwargs) -> tuple[str, str]:
        """Render template with variables"""
        subject = self.subject_template.format(**kwargs)
        body = self.body_template.format(**kwargs)
        return subject, body


class UnifiedEmailService:
    """Unified service for all email operations"""

    # Pre-defined templates
    TEMPLATES = {
        "analysis": EmailTemplate(
            name="analysis",
            subject_template="{title}: {topic}",
            body_template="""Hi {recipient_name},

{greeting}

{content}

{closing}

Best regards,
{sender_name}""",
            variables=[
                "title",
                "topic",
                "recipient_name",
                "greeting",
                "content",
                "closing",
                "sender_name",
            ],
            description="General analysis email template",
        ),
        "link_analysis": EmailTemplate(
            name="link_analysis",
            subject_template="Link Analysis: {url}",
            body_template="""Hi {recipient_name},

I've completed the analysis of the link you requested: {url}

## Summary
{summary}

## Key Insights
{insights}

## Full Analysis
{analysis}

{metadata}

Best regards,
{sender_name}""",
            variables=[
                "recipient_name",
                "url",
                "summary",
                "insights",
                "analysis",
                "metadata",
                "sender_name",
            ],
            description="Link analysis result template",
        ),
        "status_update": EmailTemplate(
            name="status_update",
            subject_template="Status Update: {project}",
            body_template="""Hi {recipient_name},

Here's the latest status update for {project}:

## Progress
{progress}

## Completed Tasks
{completed}

## Next Steps
{next_steps}

## Blockers
{blockers}

Best regards,
{sender_name}""",
            variables=[
                "recipient_name",
                "project",
                "progress",
                "completed",
                "next_steps",
                "blockers",
                "sender_name",
            ],
            description="Project status update template",
        ),
        "quick_note": EmailTemplate(
            name="quick_note",
            subject_template="{subject}",
            body_template="""Hi {recipient_name},

{message}

Best regards,
{sender_name}""",
            variables=["subject", "recipient_name", "message", "sender_name"],
            description="Simple quick note template",
        ),
        "video_analysis": EmailTemplate(
            name="video_analysis",
            subject_template="Comprehensive Analysis: {title}",
            body_template="""Hi {recipient_name},

## Comprehensive Video Analysis: {title}

### Video Metadata
{video_metadata}

### Executive Summary
{executive_summary}

### Key Technical Insights
{key_insights}

### Actionable Takeaways
{actionable_takeaways}

### Relevance to Current Work
{relevance_to_work}{obsidian_section}

### Next Steps
• Document current repetitive workflows in technical leadership
• Identify voice automation opportunities
• Create templates for common technical decisions
• Apply "seconds not minutes" principle to tool selection

---
**Analysis Generated:** {date}  
**Workflow Status:** Demonstrates direct API success over MCP complexity  
**Knowledge Capture:** Saved to Obsidian vault with semantic links  

Best regards,  
{sender_name}

---
*🤖 Generated with Claude Code*""",
            variables=[
                "recipient_name",
                "title",
                "video_metadata",
                "executive_summary",
                "key_insights",
                "actionable_takeaways",
                "relevance_to_work",
                "obsidian_section",
                "date",
                "sender_name",
            ],
            description="Comprehensive video analysis template",
        ),
        "task_completion": EmailTemplate(
            name="task_completion",
            subject_template="Task Complete: {task_name}",
            body_template="""Hi {recipient_name},

Task completed: {task_name}

## Results
{results}{files_section}

Best,  
{sender_name}

---
*Generated from task completion workflow*""",
            variables=[
                "recipient_name",
                "task_name",
                "results",
                "files_section",
                "sender_name",
            ],
            description="Task completion notification template",
        ),
    }

    def __init__(self, config: Optional[EmailConfig] = None):
        self.config = config or EmailConfig.default()
        self.gmail_service = None
        self._use_gws_cli = False

        if self.config.use_gmail_api and GMAIL_AVAILABLE:
            self._initialize_gmail()

        # Fall back to gws CLI if Gmail API is not available
        if self.gmail_service is None:
            self._check_gws_cli()

    def _check_gws_cli(self):
        """Check if gws CLI is available as a fallback email sender"""
        import shutil
        import subprocess
        gws_path = shutil.which("gws") or os.path.expanduser("~/.local/bin/gws")
        if os.path.isfile(gws_path) and os.access(gws_path, os.X_OK):
            try:
                result = subprocess.run(
                    [gws_path, "auth", "status"],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0 and "token_valid" in result.stdout:
                    status = json.loads(result.stdout)
                    if status.get("token_valid"):
                        self._use_gws_cli = True
                        self._gws_path = gws_path
                        print("Using gws CLI for email delivery (Gmail API token unavailable)")
                        return
            except Exception:
                pass
        print("Warning: Neither Gmail API nor gws CLI available for email delivery")

    def _send_via_gws(
        self, subject: str, body: str, recipient: str, html_body: Optional[str] = None
    ) -> Optional[str]:
        """Send email via gws CLI (fallback when Gmail API token is missing)"""
        import subprocess
        import tempfile
        try:
            # gws gmail +send supports --to, --subject, --body flags
            # For HTML emails, write to a temp file and use --body-file if available,
            # otherwise send as plain text
            send_body = html_body if html_body else body
            cmd = [
                self._gws_path, "gmail", "+send",
                "--to", recipient,
                "--subject", subject,
                "--body", send_body,
            ]
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=30
            )
            if result.returncode == 0:
                # Parse message ID from gws output
                try:
                    output = json.loads(result.stdout)
                    message_id = output.get("id", "gws-sent")
                except (json.JSONDecodeError, ValueError):
                    message_id = "gws-sent"
                print(f"Email sent successfully to {recipient} via gws CLI")

                # Archive to Obsidian if available
                if OBSIDIAN_ARCHIVER_AVAILABLE:
                    try:
                        archive_path = archive_to_obsidian(
                            subject, body, recipient, message_id
                        )
                        if archive_path:
                            print(f"Email archived to Obsidian")
                    except Exception as e:
                        print(f"Warning: Failed to archive to Obsidian: {e}")

                return message_id
            else:
                print(f"gws send failed: {result.stderr}")
                return None
        except Exception as e:
            print(f"Failed to send via gws CLI: {e}")
            return None

    def _initialize_gmail(self):
        """Initialize Gmail API service with automatic token refresh"""
        try:
            if not self.config.token_path or not Path(self.config.token_path).exists():
                print("Warning: Gmail token not found")
                return

            token_path = Path(self.config.token_path)
            with open(token_path, "r") as f:
                creds = Credentials.from_authorized_user_info(
                    json.load(f), ["https://www.googleapis.com/auth/gmail.modify"]
                )

            # Check if token needs refresh
            if not creds.valid:
                if creds.expired and creds.refresh_token:
                    print("Refreshing expired Gmail token...")
                    creds.refresh(Request())
                    # Save refreshed token for future use
                    with open(token_path, "w") as f:
                        f.write(creds.to_json())
                    print(f"✅ Gmail token refreshed and saved to {token_path}")
                else:
                    print("⚠️ Gmail token invalid and cannot be refreshed (no refresh_token)")
                    print("   Run: python /Users/djm/claude-projects/src/tools/email/reauth-gmail.py")
                    return

            self.gmail_service = build("gmail", "v1", credentials=creds)
        except Exception as e:
            print(f"Failed to initialize Gmail: {e}")
            if "invalid_grant" in str(e).lower():
                print("   Token has been revoked. Re-authenticate with:")
                print("   python /Users/djm/claude-projects/src/tools/email/reauth-gmail.py")
            self.gmail_service = None

    def _convert_markdown_to_html(self, markdown_text: str) -> str:
        """Convert markdown-style formatting to HTML"""
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }}
        h1 {{ color: #1a202c; margin-top: 20px; margin-bottom: 12px; font-size: 1.5em; }}
        h2 {{ color: #2c3e50; margin-top: 16px; margin-bottom: 10px; font-size: 1.3em; }}
        h3 {{ color: #34495e; margin-top: 12px; margin-bottom: 8px; font-size: 1.1em; }}
        p {{ margin: 8px 0; }}
        .section {{ margin: 16px 0; }}
        .recommendation {{ 
            background-color: #e8f4f8; 
            padding: 12px; 
            border-radius: 5px;
            margin: 12px 0;
        }}
        ul {{ margin: 5px 0; padding-left: 25px; }}
        ol {{ margin: 5px 0; padding-left: 25px; }}
        li {{ margin: 3px 0; }}
        code {{ 
            background-color: #f4f4f4; 
            padding: 2px 4px; 
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }}
        pre {{ 
            background-color: #f4f4f4; 
            padding: 10px; 
            border-radius: 5px; 
            overflow-x: auto;
            white-space: pre-wrap;
            margin: 10px 0;
        }}
        blockquote {{
            border-left: 4px solid #ddd;
            padding-left: 15px;
            color: #666;
            margin: 8px 0;
        }}
        .metadata {{
            color: #666;
            font-size: 0.9em;
            margin: 8px 0;
        }}
        .footer {{
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 0.9em;
        }}
    </style>
</head>
<body>
"""

        # Convert the markdown text to HTML
        lines = markdown_text.split("\n")
        in_code_block = False
        in_list = False
        in_ordered_list = False
        html_lines = []

        for i, line in enumerate(lines):
            # Handle code blocks
            if line.strip().startswith("```"):
                if in_code_block:
                    html_lines.append("</pre>")
                    in_code_block = False
                else:
                    lang = line.strip()[3:] if len(line.strip()) > 3 else ""
                    html_lines.append(f"<pre>")
                    in_code_block = True
                continue

            if in_code_block:
                html_lines.append(line)
                continue

            # Check if we need to close lists
            is_list_item = line.strip().startswith("• ") or line.strip().startswith(
                "- "
            )
            is_ordered_item = bool(re.match(r"^\d+\.\s", line.strip()))

            if in_list and not is_list_item and not line.strip().startswith("  "):
                html_lines.append("</ul>")
                in_list = False
            elif in_ordered_list and not is_ordered_item:
                html_lines.append("</ol>")
                in_ordered_list = False

            # Convert headers
            if line.startswith("### "):
                html_lines.append(f"<h3>{line[4:]}</h3>")
            elif line.startswith("## "):
                html_lines.append(f"<h2>{line[3:]}</h2>")
            elif line.startswith("# "):
                html_lines.append(f"<h1>{line[2:]}</h1>")
            # Convert bullet points
            elif is_list_item:
                if not in_list:
                    html_lines.append("<ul>")
                    in_list = True
                content = line.strip()[2:]
                # Handle bold text in list items
                content = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", content)
                # Handle inline code in list items
                content = re.sub(r"`([^`]+)`", r"<code>\1</code>", content)
                # Handle markdown links in list items
                content = re.sub(
                    r"\[([^\]]+)\]\(([^\)]+)\)", r'<a href="\2">\1</a>', content
                )
                html_lines.append(f"<li>{content}</li>")
            # Convert numbered lists
            elif is_ordered_item:
                if not in_ordered_list:
                    html_lines.append("<ol>")
                    in_ordered_list = True
                content = re.sub(r"^\d+\.\s", "", line.strip())
                # Handle bold text in list items
                content = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", content)
                # Handle inline code in list items
                content = re.sub(r"`([^`]+)`", r"<code>\1</code>", content)
                # Handle markdown links in list items
                content = re.sub(
                    r"\[([^\]]+)\]\(([^\)]+)\)", r'<a href="\2">\1</a>', content
                )
                html_lines.append(f"<li>{content}</li>")
            # Convert blockquotes
            elif line.strip().startswith("> "):
                html_lines.append(f"<blockquote>{line.strip()[2:]}</blockquote>")
            # Handle paragraphs with bold or code
            elif line.strip():
                # Process bold text
                processed_line = re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", line)
                # Process inline code
                processed_line = re.sub(
                    r"`([^`]+)`", r"<code>\1</code>", processed_line
                )
                # Process markdown links [text](url)
                processed_line = re.sub(
                    r"\[([^\]]+)\]\(([^\)]+)\)", r'<a href="\2">\1</a>', processed_line
                )
                html_lines.append(f"<p>{processed_line}</p>")
            # Skip empty lines instead of adding <br>
            # This reduces excessive spacing

        # Close any open lists
        if in_list:
            html_lines.append("</ul>")
        if in_ordered_list:
            html_lines.append("</ol>")

        html_content += "\n".join(html_lines)
        html_content += "\n</body>\n</html>"

        return html_content

    def send_email(
        self,
        subject: str,
        body: str,
        recipient_email: Optional[str] = None,
        template: Optional[str] = None,
        template_vars: Optional[Dict[str, Any]] = None,
        use_html: bool = True,
    ) -> Optional[str]:
        """Send an email using configured method"""

        # Use template if provided
        if template and template in self.TEMPLATES:
            if not template_vars:
                raise ValueError(
                    f"Template '{template}' requires variables: {self.TEMPLATES[template].variables}"
                )

            # Add default values
            template_vars.setdefault("sender_name", self.config.sender_name)
            template_vars.setdefault("recipient_name", self.config.recipient_name)

            subject, body = self.TEMPLATES[template].render(**template_vars)

        recipient = recipient_email or self.config.recipient_email

        # Convert to HTML if requested
        html_body = None
        if use_html:
            # Skip conversion if body is already a complete HTML document
            stripped = body.strip()
            if stripped.startswith(('<!DOCTYPE', '<!doctype', '<html', '<HTML')):
                html_body = body
            else:
                html_body = self._convert_markdown_to_html(body)

        if self.config.use_gmail_api and self.gmail_service:
            return self._send_via_gmail(subject, body, recipient, html_body)
        elif self._use_gws_cli:
            return self._send_via_gws(subject, body, recipient, html_body)
        else:
            return self._send_via_smtp(subject, body, recipient)

    def _send_via_gmail(
        self, subject: str, body: str, recipient: str, html_body: Optional[str] = None
    ) -> Optional[str]:
        """Send email via Gmail API with optional HTML formatting"""
        try:
            if html_body:
                # Create multipart message with both plain text and HTML
                message = MIMEMultipart("alternative")
                message["to"] = recipient
                message["from"] = self.config.sender_email
                message["subject"] = subject

                # Add plain text part
                text_part = MIMEText(body, "plain", _charset="utf-8")
                message.attach(text_part)

                # Add HTML part
                html_part = MIMEText(html_body, "html", _charset="utf-8")
                message.attach(html_part)
            else:
                # Single plain text message
                message = MIMEText(body, _charset="utf-8")
                message["to"] = recipient
                message["from"] = self.config.sender_email
                message["subject"] = subject

            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

            result = (
                self.gmail_service.users()
                .messages()
                .send(userId="me", body={"raw": raw_message})
                .execute()
            )

            message_id = result.get("id")
            print(f"✅ Email sent successfully to {recipient}")

            # Archive to Obsidian if available
            if OBSIDIAN_ARCHIVER_AVAILABLE:
                try:
                    archive_path = archive_to_obsidian(
                        subject, body, recipient, message_id
                    )
                    if archive_path:
                        print(f"📝 Email archived to Obsidian")
                except Exception as e:
                    print(f"⚠️ Failed to archive to Obsidian: {e}")

            return message_id

        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return None

    def _send_via_smtp(self, subject: str, body: str, recipient: str) -> Optional[str]:
        """Send email via SMTP (fallback)"""
        print("SMTP sending not yet implemented")
        return None

    def send_to_david(
        self, subject: str, body: str, use_html: bool = True
    ) -> Optional[str]:
        """Convenience method to send to David"""
        return self.send_email(subject, body, use_html=use_html)

    def send_analysis(
        self,
        title: str,
        topic: str,
        content: str,
        greeting: str = "I've completed the analysis you requested.",
        closing: str = "Let me know if you need any clarification or additional analysis.",
    ) -> Optional[str]:
        """Send an analysis email using template"""
        return self.send_email(
            subject="",  # Will be filled by template
            body="",  # Will be filled by template
            template="analysis",
            template_vars={
                "title": title,
                "topic": topic,
                "greeting": greeting,
                "content": content,
                "closing": closing,
            },
        )

    def send_link_analysis(
        self, url: str, summary: str, insights: str, analysis: str, metadata: str = ""
    ) -> Optional[str]:
        """Send link analysis results"""
        return self.send_email(
            subject="",
            body="",
            template="link_analysis",
            template_vars={
                "url": url,
                "summary": summary,
                "insights": insights,
                "analysis": analysis,
                "metadata": metadata,
            },
        )

    def send_analysis_summary(
        self,
        title: str,
        video_metadata: str,
        executive_summary: str,
        key_insights: str,
        actionable_takeaways: str,
        relevance_to_work: str,
        obsidian_paths: Optional[List[str]] = None,
    ) -> Optional[str]:
        """Send comprehensive video analysis using template"""
        obsidian_section = ""
        if obsidian_paths:
            obsidian_section = f"""

## Knowledge Capture
Saved to Obsidian vault with semantic links:
"""
            for path in obsidian_paths:
                obsidian_section += f"- {path}\n"

        return self.send_email(
            subject="",
            body="",
            template="video_analysis",
            template_vars={
                "title": title,
                "video_metadata": video_metadata,
                "executive_summary": executive_summary,
                "key_insights": key_insights,
                "actionable_takeaways": actionable_takeaways,
                "relevance_to_work": relevance_to_work,
                "obsidian_section": obsidian_section,
                "date": datetime.now().strftime("%Y-%m-%d"),
            },
        )

    def send_task_completion(
        self, task_name: str, results: str, files_created: Optional[List[str]] = None
    ) -> Optional[str]:
        """Send task completion notification"""
        files_section = ""
        if files_created:
            files_section = f"\n\n## Files Created/Modified\n\n"
            for file in files_created:
                files_section += f"- {file}\n"

        return self.send_email(
            subject="",
            body="",
            template="task_completion",
            template_vars={
                "task_name": task_name,
                "results": results,
                "files_section": files_section,
            },
        )

    def list_templates(self) -> List[Dict[str, Any]]:
        """List available templates"""
        return [
            {
                "name": template.name,
                "description": template.description,
                "variables": template.variables,
            }
            for template in self.TEMPLATES.values()
        ]


# Compatibility layer for existing scripts
def send_email_to_david(subject: str, body: str) -> Optional[str]:
    """Legacy compatibility function"""
    service = UnifiedEmailService()
    return service.send_to_david(subject, body)


def main():
    """CLI interface for email service"""
    import argparse

    parser = argparse.ArgumentParser(description="Unified Email Service")
    parser.add_argument("command", choices=["send", "templates", "test", "status"], help="Command to run")
    parser.add_argument("--subject", help="Email subject")
    parser.add_argument("--body", help="Email body")
    parser.add_argument("--template", help="Template name")
    parser.add_argument("--file", help="Read body from file")

    args = parser.parse_args()

    service = UnifiedEmailService()

    def _jsonl_log(record: dict):
        try:
            log_dir = Path(__file__).resolve().parents[5] / "01-tools" / ".claude" / "logs" / "tools" / "unified_email_service"
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / f"agent_runs-{datetime.now().strftime('%Y%m%d')}.jsonl"
            with log_file.open("a") as f:
                f.write(_json.dumps(record) + "\n")
        except Exception:
            pass

    def _status(days: int = 2, slo_hours: int = 24) -> int:
        log_dir = Path(__file__).resolve().parents[5] / "01-tools" / ".claude" / "logs" / "tools" / "unified_email_service"
        if not log_dir.exists():
            print("❌ No logs found")
            return 1
        last_success = None
        horizon = datetime.now() - timedelta(days=days)
        for f in sorted(log_dir.glob("agent_runs-*.jsonl"), reverse=True):
            try:
                date_str = f.stem.split("-")[-1]
                file_date = datetime.strptime(date_str, "%Y%m%d")
                if file_date < horizon.replace(hour=0, minute=0, second=0, microsecond=0):
                    break
                with f.open() as fh:
                    for line in fh:
                        try:
                            rec = _json.loads(line)
                        except Exception:
                            continue
                        if rec.get("status") == "success":
                            ts = rec.get("end_time") or rec.get("timestamp")
                            if not ts:
                                continue
                            try:
                                t = datetime.fromisoformat(ts.replace("Z", ""))
                            except Exception:
                                continue
                            if last_success is None or t > last_success:
                                last_success = t
            except Exception:
                continue
            if last_success:
                break
        if not last_success:
            print("❌ No successful runs in recent logs")
            return 1
        age = datetime.now() - last_success
        if age.total_seconds() > slo_hours * 3600:
            print(f"❌ SLO breach: last success {int(age.total_seconds()/3600)}h ago (> {slo_hours}h)")
            return 1
        print(f"✅ Last success: {last_success.strftime('%Y-%m-%d %H:%M:%S')}")
        return 0

    if args.command == "templates":
        print("Available Email Templates:")
        print("=" * 50)
        for template in service.list_templates():
            print(f"\n{template['name']}: {template['description']}")
            print(f"Variables: {', '.join(template['variables'])}")

    elif args.command == "test":
        result = service.send_to_david(
            "Test Email from Unified Service",
            "This is a test email from the new unified email service.\n\nIf you receive this, the consolidation is working!",
        )
        if result:
            print(f"Test email sent: {result}")
        # Log success
        _jsonl_log({
            "timestamp": datetime.now().isoformat(timespec="milliseconds") + "Z",
            "component": "tools",
            "job_id": "unified_email_service",
            "job_name": "Unified Email Service (test)",
            "status": "success" if result else "failed",
            "end_time": datetime.now().isoformat()
        })

    elif args.command == "send":
        if args.file:
            body = Path(args.file).read_text()
        else:
            body = args.body or "No body provided"

        subject = args.subject or "Email from Claude"

        start = datetime.now()
        result = service.send_to_david(subject, body)
        if result:
            print(f"Email sent: {result}")
        # Log outcome
        _jsonl_log({
            "timestamp": datetime.now().isoformat(timespec="milliseconds") + "Z",
            "component": "tools",
            "job_id": "unified_email_service",
            "job_name": "Unified Email Service (send)",
            "status": "success" if result else "failed",
            "start_time": start.isoformat(),
            "end_time": datetime.now().isoformat(),
            "context": {"subject": subject}
        })

    elif args.command == "status":
        code = _status()
        raise SystemExit(code)


if __name__ == "__main__":
    main()
