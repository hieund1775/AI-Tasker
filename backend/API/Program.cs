using AITasker_Modular.Database;
using AITasker_Modular.Modules.CategoryTagModule;
using AITasker_Modular.Modules.ChatModule;
using AITasker_Modular.Modules.InteractionModule;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalhost5173",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

builder.Services.AddDbContext<DataContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<ICategoryTagService, CategoryTagService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IInteractionService, InteractionService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<DataContext>();
        await db.Database.MigrateAsync();

        if (!await db.AICategoryDomains.AnyAsync())
        {
            db.AICategoryDomains.AddRange(new List<AICategoryDomain>
            {
                new AICategoryDomain { Id = Guid.NewGuid(), Name = "Natural Language Processing (NLP)" },
                new AICategoryDomain { Id = Guid.NewGuid(), Name = "Computer Vision" },
                new AICategoryDomain { Id = Guid.NewGuid(), Name = "Generative AI" },
                new AICategoryDomain { Id = Guid.NewGuid(), Name = "Machine Learning Engineering" }
            });
        }

        if (!await db.Skills.AnyAsync())
        {
            db.Skills.AddRange(new List<Skill>
            {
                new Skill { Id = Guid.NewGuid(), Name = "Python" },
                new Skill { Id = Guid.NewGuid(), Name = "PyTorch" },
                new Skill { Id = Guid.NewGuid(), Name = "TensorFlow" },
                new Skill { Id = Guid.NewGuid(), Name = "Transformers (HuggingFace)" },
                new Skill { Id = Guid.NewGuid(), Name = "LLM Fine-Tuning" },
                new Skill { Id = Guid.NewGuid(), Name = "Prompt Engineering" },
                new Skill { Id = Guid.NewGuid(), Name = "Docker" }
            });
        }
        await db.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Lỗi hệ thống tự động cập nhật cấu trúc Database.");
    }
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "AITasker Modular API v1");
    c.RoutePrefix = string.Empty;
}); 

app.UseCors("AllowLocalhost5173");

app.UseAuthorization();
app.MapControllers();

app.Run();