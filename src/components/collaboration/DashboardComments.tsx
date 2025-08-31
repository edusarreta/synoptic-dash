import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Reply, Check, AtSign, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  comment_text: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  mentioned_users: string[];
  parent_comment_id?: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

interface DashboardCommentsProps {
  dashboardId: string;
  chartId?: string;
}

export function DashboardComments({ dashboardId, chartId }: DashboardCommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    loadComments();
    loadTeamMembers();
  }, [dashboardId, chartId]);

  const loadComments = async () => {
    if (!user) return;

    try {
      const query = supabase
        .from('dashboard_comments')
        .select(`
          id,
          comment_text,
          user_id,
          mentioned_users,
          parent_comment_id,
          is_resolved,
          created_at,
          updated_at,
          profiles!user_id (
            full_name,
            email
          )
        `)
        .eq('dashboard_id', dashboardId)
        .order('created_at', { ascending: true });

      if (chartId) {
        query.eq('chart_id', chartId);
      } else {
        query.is('chart_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Organize comments into threaded structure
      const commentMap = new Map();
      const rootComments: Comment[] = [];

      data?.forEach((comment: any) => {
        const commentData: Comment = {
          id: comment.id,
          comment_text: comment.comment_text,
          user_id: comment.user_id,
          user_name: comment.profiles?.full_name,
          user_email: comment.profiles?.email,
          mentioned_users: comment.mentioned_users || [],
          parent_comment_id: comment.parent_comment_id,
          is_resolved: comment.is_resolved,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          replies: [],
        };

        commentMap.set(comment.id, commentData);

        if (!comment.parent_comment_id) {
          rootComments.push(commentData);
        }
      });

      // Add replies to parent comments
      data?.forEach((comment: any) => {
        if (comment.parent_comment_id) {
          const parent = commentMap.get(comment.parent_comment_id);
          const child = commentMap.get(comment.id);
          if (parent && child) {
            parent.replies!.push(child);
          }
        }
      });

      setComments(rootComments);
    } catch (error: any) {
      console.error('Error loading comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments.",
        variant: "destructive",
      });
    }
  };

  const loadTeamMembers = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('org_id', profile.org_id);

        setTeamMembers(data || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        // Extract mentions from comment text
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(newComment)) !== null) {
          const mentionedUser = teamMembers.find(
            member => member.full_name?.toLowerCase().includes(match[1].toLowerCase()) ||
                     member.email?.toLowerCase().includes(match[1].toLowerCase())
          );
          if (mentionedUser) {
            mentions.push(mentionedUser.id);
          }
        }

        const { error } = await supabase
          .from('dashboard_comments')
          .insert({
            dashboard_id: dashboardId,
            chart_id: chartId,
            comment_text: newComment,
            user_id: user.id,
            account_id: profile.org_id,
            mentioned_users: mentions,
            parent_comment_id: replyTo,
          });

        if (error) throw error;

        setNewComment('');
        setReplyTo(null);
        loadComments();

        toast({
          title: "Comment Added",
          description: "Your comment has been posted.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('dashboard_comments')
        .update({ is_resolved: true })
        .eq('id', commentId);

      if (error) throw error;

      loadComments();
      toast({
        title: "Comment Resolved",
        description: "Comment has been marked as resolved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`space-y-3 ${isReply ? 'ml-6 pl-4 border-l-2 border-muted' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src="" />
          <AvatarFallback>
            {comment.user_name?.charAt(0) || comment.user_email?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {comment.user_name || comment.user_email || 'Unknown User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.is_resolved && (
              <Badge variant="secondary" className="text-xs">
                <Check className="w-3 h-3 mr-1" />
                Resolved
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground">{comment.comment_text}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(comment.id)}
              className="text-xs"
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
            {!comment.is_resolved && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resolveComment(comment.id)}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Resolve
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="glass-card border-0 shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Comments {chartId ? '(Chart Level)' : '(Dashboard Level)'}
          <Badge variant="secondary">{comments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="space-y-3">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Reply className="w-4 h-4" />
              Replying to comment
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback>
                {user?.email?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Add a comment... Use @name to mention team members"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex items-center gap-2">
                <Button
                  onClick={addComment}
                  disabled={!newComment.trim() || loading}
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {replyTo ? 'Reply' : 'Comment'}
                </Button>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AtSign className="w-3 h-3" />
                  Mention team members with @
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Comments List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-6">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No comments yet. Start the conversation!</p>
              </div>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}