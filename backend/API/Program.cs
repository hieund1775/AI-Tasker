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
using ProjectTask = AITasker_Modular.Modules.ProjectModule.Task;
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
        new MySqlServerVersion(new Version(8, 0, 30)),
        mySqlOptions => mySqlOptions.EnableRetryOnFailure()
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

        // Seed Test Users (Client & Expert)
        var clientId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var expertId = Guid.Parse("22222222-2222-2222-2222-222222222222");

        if (!await db.Users.AnyAsync(u => u.Id == clientId))
        {
            var testClient = new ApplicationUser
            {
                Id = clientId,
                Email = "client@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456", 11),
                FullName = "Nguyễn Văn Client",
                Role = "Client",
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(testClient);
            db.Wallets.Add(new Wallet { UserId = clientId, Balance = 5000m });
        }

        if (!await db.Users.AnyAsync(u => u.Id == expertId))
        {
            var testExpert = new ApplicationUser
            {
                Id = expertId,
                Email = "expert@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456", 11),
                FullName = "Lê Văn Expert",
                Role = "Expert",
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(testExpert);
            db.Wallets.Add(new Wallet { UserId = expertId, Balance = 0m });
            db.ExpertProfiles.Add(new ExpertProfile
            {
                UserId = expertId,
                JobTitle = "Chuyên gia Trí tuệ Nhân tạo (AI Expert)",
                Major = "Khoa học Máy tính",
                Bio = "Tôi là chuyên gia AI với 5 năm kinh nghiệm phát triển các giải pháp NLP, Generative AI và RAG.",
                ReputationCredit = 5.0m,
                SuccessRate = 1.0
            });
        }

        // Seed a Test JobPost
        var jobId = Guid.Parse("33333333-3333-3333-3333-333333333333");
        if (!await db.JobPosts.AnyAsync(j => j.Id == jobId))
        {
            var nlpDomain = await db.Domains.FirstOrDefaultAsync(d => d.Name.Contains("Natural Language Processing"));
            var chatbotSpec = await db.Specializations.FirstOrDefaultAsync(s => s.Name.Contains("Chatbots"));

            var testJob = new JobPost
            {
                Id = jobId,
                ClientId = clientId,
                Title = "Xây dựng Chatbot AI tích hợp RAG",
                Description = "Dự án xây dựng chatbot hỗ trợ hỏi đáp dựa trên tài liệu nội bộ sử dụng LangChain và GPT-4o.",
                Budget = 1500m,
                Deadline = 15,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                DomainId = nlpDomain?.Id,
                SpecializationId = chatbotSpec?.Id,
                DurationValue = 15,
                DurationUnit = "Days"
            };
            db.JobPosts.Add(testJob);

            // Seed JobRequirements (usecases)
            db.JobRequirements.AddRange(new List<JobRequirement>
            {
                new JobRequirement { Id = Guid.Parse("44444444-4444-4444-4444-444444444441"), JobPostId = jobId, UseCaseName = "Thiết lập cơ sở dữ liệu Vector (ChromaDB)", Description = "Cấu hình DB vector để indexing tài liệu." },
                new JobRequirement { Id = Guid.Parse("44444444-4444-4444-4444-444444444442"), JobPostId = jobId, UseCaseName = "Tích hợp mô hình ngôn ngữ lớn (GPT-4o)", Description = "Xử lý prompt template và kết nối LLM API." },
                new JobRequirement { Id = Guid.Parse("44444444-4444-4444-4444-444444444443"), JobPostId = jobId, UseCaseName = "Xây dựng API Endpoint hỏi đáp", Description = "Tạo RESTful endpoint kết nối frontend." }
            });
        }

        // Seed a Test Proposal
        var proposalId = Guid.Parse("55555555-5555-5555-5555-555555555555");
        if (!await db.Proposals.AnyAsync(p => p.Id == proposalId))
        {
            var testProposal = new Proposal
            {
                Id = proposalId,
                JobPostId = jobId,
                ExpertId = expertId,
                BidAmount = 1200m,
                EstimatedDuration = 12,
                Introduction = "Chào anh/chị, tôi là chuyên gia AI với 3 năm kinh nghiệm phát triển các hệ thống RAG và LLM.",
                Implementation = "Tuần 1: Thiết lập Vector DB và tiền xử lý data. Tuần 2: Tích hợp LLM và hoàn thiện API.",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };
            db.Proposals.Add(testProposal);
        }

        // Seed an Already Accepted Proposal and Active Project for testing
        var acceptedJobId = Guid.Parse("33333333-3333-3333-3333-333333333334");
        if (!await db.JobPosts.AnyAsync(j => j.Id == acceptedJobId))
        {
            var nlpDomain = await db.Domains.FirstOrDefaultAsync(d => d.Name.Contains("Natural Language Processing"));
            var testJob2 = new JobPost
            {
                Id = acceptedJobId,
                ClientId = clientId,
                Title = "Xây dựng Hệ thống Gợi ý Sản phẩm",
                Description = "Hệ thống gợi ý sản phẩm cho trang e-commerce sử dụng collaborative filtering.",
                Budget = 2000m,
                Deadline = 30,
                Status = "In Progress",
                CreatedAt = DateTime.UtcNow,
                DomainId = nlpDomain?.Id,
                DurationValue = 30,
                DurationUnit = "Days"
            };
            db.JobPosts.Add(testJob2);
        }

        var acceptedProposalId = Guid.Parse("55555555-5555-5555-5555-555555555556");
        if (!await db.Proposals.AnyAsync(p => p.Id == acceptedProposalId))
        {
            var testProposal2 = new Proposal
            {
                Id = acceptedProposalId,
                JobPostId = acceptedJobId,
                ExpertId = expertId,
                BidAmount = 1800m,
                EstimatedDuration = 25,
                Introduction = "Tôi có nhiều kinh nghiệm làm Recommendation System.",
                Implementation = "Huấn luyện mô hình và deploy lên AWS.",
                Status = "Accepted",
                CreatedAt = DateTime.UtcNow
            };
            db.Proposals.Add(testProposal2);
        }

        var testProjectId = Guid.Parse("66666666-6666-6666-6666-666666666666");
        if (!await db.Projects.AnyAsync(p => p.Id == testProjectId))
        {
            var testProject = new Project
            {
                Id = testProjectId,
                JobPostId = acceptedJobId,
                ClientId = clientId,
                ExpertId = expertId,
                EscrowBalance = 1800m,
                Status = "In Progress",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddDays(25)
            };
            db.Projects.Add(testProject);

            // Copy a skill to ProjectSkill
            var pythonSkill = await db.Skills.FirstOrDefaultAsync(s => s.Name == "Python");
            if (pythonSkill != null)
            {
                db.ProjectSkills.Add(new ProjectSkill
                {
                    ProjectsId = testProjectId,
                    SkillsId = pythonSkill.Id
                });
            }
        }

        var task1Id = Guid.Parse("77777777-7777-7777-7777-777777777771");
        if (!await db.ProjectTasks.AnyAsync(t => t.Id == task1Id))
        {
            var task1 = new ProjectTask
            {
                Id = task1Id,
                ProjectId = testProjectId,
                Title = "Thu thập và tiền xử lý dữ liệu hành vi người dùng",
                Status = "In Progress",
                UpdatedAt = DateTime.UtcNow
            };
            db.ProjectTasks.Add(task1);
        }

        var task2Id = Guid.Parse("77777777-7777-7777-7777-777777777772");
        if (!await db.ProjectTasks.AnyAsync(t => t.Id == task2Id))
        {
            var task2 = new ProjectTask
            {
                Id = task2Id,
                ProjectId = testProjectId,
                Title = "Xây dựng và huấn luyện mô hình Matrix Factorization",
                Status = "In Progress",
                UpdatedAt = DateTime.UtcNow
            };
            db.ProjectTasks.Add(task2);
        }

        var miniTaskId = Guid.Parse("88888888-8888-8888-8888-888888888881");
        if (!await db.MiniTasks.AnyAsync(mt => mt.Id == miniTaskId))
        {
            db.MiniTasks.Add(new MiniTask
            {
                Id = miniTaskId,
                TaskId = task1Id,
                Title = "Viết script python cào log click",
                IsCompleted = false,
                CreatedAt = DateTime.UtcNow
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
app.UseStaticFiles();
app.UseAuthorization();
app.MapControllers();

app.Run();