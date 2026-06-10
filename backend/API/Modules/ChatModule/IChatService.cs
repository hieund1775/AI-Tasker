namespace AITasker_Modular.Modules.ChatModule;

public interface IChatService
{
    Task<IReadOnlyList<Conversation>> GetConversationsAsync();
    Task<Message> SendMessageAsync(Message message);
}
