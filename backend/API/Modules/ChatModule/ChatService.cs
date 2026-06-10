namespace AITasker_Modular.Modules.ChatModule;

public class ChatService : IChatService
{
    public Task<IReadOnlyList<Conversation>> GetConversationsAsync()
    {
        return Task.FromResult<IReadOnlyList<Conversation>>(new List<Conversation>());
    }

    public Task<Message> SendMessageAsync(Message message)
    {
        message.Id = Guid.NewGuid();
        return Task.FromResult(message);
    }
}
