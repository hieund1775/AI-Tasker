using AITasker_Modular.Database;
using AITasker_Modular.Modules.CategoryTagModule;
using AITasker_Modular.Modules.ChatModule;
using AITasker_Modular.Modules.InteractionModule;
using AITasker_Modular.Modules.JobModule;
using AITasker_Modular.Modules.JobPostModule; 
using AITasker_Modular.Modules.ProjectModule;
using AITasker_Modular.Modules.UserModule;
using AITasker_Modular.Modules.AdminModule; // Đồng bộ cấu trúc AdminModule của Minh
using Microsoft.EntityFrameworkCore;
using AITasker_Modular.Modules.ProposalModule;
using AITasker_Modular.Modules.AiModule;
using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "AITasker Modular API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter your token below.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement()
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = Microsoft.OpenApi.Models.ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

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
    options.UseMySql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        new MySqlServerVersion(new Version(8, 0, 30))
    ));

// --- ĐĂNG KÝ CÁC DỊCH VỤ HỆ THỐNG GỐC (DI) ---
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICategoryTagService, CategoryTagService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IInteractionService, InteractionService>();
builder.Services.AddScoped<IProposalService, ProposalService>();

// --- TÍCH HỢP HỆ THỐNG QUẢN TRỊ ADMIN ĐỘC LẬP ---
builder.Services.AddScoped<IAdminService, AdminService>();

// --- ĐỒNG BỘ ĐĂNG KÝ HỆ THỐNG JOBPOSTMODULE THỰC TẾ ---
builder.Services.AddScoped<IJobPostService, JobPostService>(); 

// --- ĐĂNG KÝ HỆ THỐNG AI MODULE ---
builder.Services.AddHttpClient<GeminiUtil>();
builder.Services.AddScoped<AiChatService>(); 
builder.Services.AddScoped<AiRecommendationService>();

var app = builder.Build();

// --- TỰ ĐỘNG KHỞI CHẠY VÀ MIGRATION DATABASE TOÀN CỤC ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<DataContext>();
        await db.Database.MigrateAsync();

        using (var command = db.Database.GetDbConnection().CreateCommand())
        {
            await db.Database.OpenConnectionAsync();
            command.CommandText = "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'JobPosts' AND COLUMN_NAME = 'Deadline';";
            var dataType = (string?)await command.ExecuteScalarAsync();
            if (dataType != null && (dataType.Equals("datetime", StringComparison.OrdinalIgnoreCase) || dataType.Equals("datetime2", StringComparison.OrdinalIgnoreCase)))
            {
                command.CommandText = "ALTER TABLE JobPosts DROP COLUMN Deadline; ALTER TABLE JobPosts ADD Deadline INT NOT NULL DEFAULT 0;";
                await command.ExecuteNonQueryAsync();
            }
        }

        // Seed Domains
        if (!await db.Domains.AnyAsync())
        {
            var nlp = new Domain { Id = Guid.NewGuid(), Name = "Natural Language Processing (NLP)" };
            nlp.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Chatbots & Conversational Agents", DomainId = nlp.Id });
            nlp.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Text Classification & Sentiment Analysis", DomainId = nlp.Id });
            nlp.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Machine Translation", DomainId = nlp.Id });

            var cv = new Domain { Id = Guid.NewGuid(), Name = "Computer Vision" };
            cv.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Object Detection & Tracking", DomainId = cv.Id });
            cv.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Image Generation & Editing", DomainId = cv.Id });
            cv.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Face Recognition", DomainId = cv.Id });

            var genai = new Domain { Id = Guid.NewGuid(), Name = "Generative AI" };
            genai.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "LLM Fine-tuning", DomainId = genai.Id });
            genai.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Prompt Engineering", DomainId = genai.Id });
            genai.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Retrieval-Augmented Generation (RAG)", DomainId = genai.Id });

            var mle = new Domain { Id = Guid.NewGuid(), Name = "Machine Learning Engineering" };
            mle.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Model Deployment & MLOps", DomainId = mle.Id });
            mle.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Recommendation Systems", DomainId = mle.Id });
            mle.Specializations.Add(new Specialization { Id = Guid.NewGuid(), Name = "Anomaly Detection", DomainId = mle.Id });

            db.Domains.AddRange(new List<Domain> { nlp, cv, genai, mle });
        }

        // Seed Skills
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

        var testSkills = new List<string> { "React.js", "Vue.js", "Node.js", "LangChain", "Semantic Kernel" };
        foreach (var skillName in testSkills)
        {
            if (!await db.Skills.AnyAsync(s => s.Name == skillName))
            {
                db.Skills.Add(new Skill { Id = Guid.NewGuid(), Name = skillName });
            }
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
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();

app.Run();