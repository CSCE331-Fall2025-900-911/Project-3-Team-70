package app;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.stage.Stage;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;

import java.io.File;
import java.io.InputStream;
import java.sql.*;
import java.util.*;
import java.time.*;



public class CashierController {

    //FXML Connections
    @FXML private FlowPane drinkPane;
    @FXML private ListView<String> orderListView;
    @FXML private Label totalLabel;
    @FXML private Button btnBack;


    private double total = 0.0;
    private static LocalDateTime currDateTime = LocalDateTime.now();

    // ===== CATEGORY BUTTON HANDLERS =====
    @FXML private void handleIceBlendedClick(ActionEvent e) { loadDrinks("Ice-Blended"); }
    @FXML private void handleFruityClick(ActionEvent e) { loadDrinks("Fruity Beverage"); }
    @FXML private void handleFreshBrewClick(ActionEvent e) { loadDrinks("Fresh Brew"); }
    @FXML private void handleMilkyClick(ActionEvent e) { loadDrinks("Milky Series"); }
    @FXML private void handleMatchaClick(ActionEvent e) { loadDrinks("New Matcha Series"); }
    @FXML private void handleNonCaffeinatedClick(ActionEvent e) { loadDrinks("Non-Caffeinated"); }

    // ===== SET DATABASE DATE =====
    // Format is YYYY-MM-DD
    public static void setCurrDate(String date){
        LocalDate currDay = LocalDate.parse(date);
        currDateTime = currDay.atStartOfDay();
    }

    private void randomizeTime(){
        Random rand = new Random();
        int hour = 9 + rand.nextInt(9); // 9am to 5pm
        int minute = rand.nextInt(60);
        int second = rand.nextInt(60);

        currDateTime = currDateTime
                .withHour(hour)
                .withMinute(minute)
                .withSecond(second)
                .withNano(0);
    }

    // ===== LOAD MENU IMAGE WITH FALLBACK =====
private Image loadMenuImage(int imageID) {
    String basePath = System.getProperty("user.dir") + "/GUI/src/images/";
    File imageFile = new File(basePath + imageID + ".png");

    if (imageFile.exists()) {
        return new Image(imageFile.toURI().toString());
    }

    File defaultFile = new File(basePath + "default.png");
    if (defaultFile.exists()) {
        System.out.println("Missing image for ID " + imageID + ", using default.");
        return new Image(defaultFile.toURI().toString());
    }

    System.err.println("Default image missing! Please ensure default.png exists.");
    return null;
}
    // ===== LOAD DRINKS FROM DATABASE =====
    private void loadDrinks(String category) {
        drinkPane.getChildren().clear();

        try (Connection conn = DatabaseConnector.getConnection()) {
            if (conn == null) {
                System.err.println(" Could not connect to database.");
                return;
            }

            String query = "SELECT menuName, price, menuImage, SeasonalStart, SeasonalEnd FROM menu WHERE category = ?";
            try (PreparedStatement stmt = conn.prepareStatement(query)) {
                stmt.setString(1, category);
                ResultSet rs = stmt.executeQuery();

                boolean found = false;

                while (rs.next()) {
                    Timestamp startTs = rs.getTimestamp("SeasonalStart");
                    Timestamp endTs = rs.getTimestamp("SeasonalEnd");

                    boolean showItem = false;
                    if(startTs == null || endTs == null)
                    {
                        showItem = true;
                    }
                    else{
                        LocalDateTime start = startTs.toLocalDateTime();
                        LocalDateTime end = endTs.toLocalDateTime();

                        int startMonth = start.getMonthValue();
                        int startDay = start.getDayOfMonth();
                        int endMonth = end.getMonthValue();
                        int endDay = end.getDayOfMonth();

                        int currMonth = currDateTime.getMonthValue();
                        int currDay = currDateTime.getDayOfMonth();

                        // Compare by month/day only
                        boolean afterStart = (currMonth > startMonth) || (currMonth == startMonth && currDay >= startDay);
                        boolean beforeEnd = (currMonth < endMonth) || (currMonth == endMonth && currDay <= endDay);

                        // Handle wrap-around seasons (e.g., starts in Nov, ends in Feb)
                        if (endMonth < startMonth) {
                            showItem = afterStart || beforeEnd;
                        } else {
                            showItem = afterStart && beforeEnd;
                        }
                    }
                    if(showItem)
                    {
                        found = true;
                        String name = rs.getString("menuName");
                        double price = rs.getDouble("price");
                        int imageID = rs.getInt("menuImage");
                        VBox card = createDrinkCard(name, price, imageID);
                        drinkPane.getChildren().add(card);
                        System.out.println("Loaded from DB: " + name + " - $" + price);
                    }
                }

                if (!found) {
                    Label noItems = new Label("No items found for: " + category);
                    noItems.setStyle("-fx-text-fill: gray;");
                    drinkPane.getChildren().add(noItems);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ===== CREATE DRINK CARD =====
    private VBox createDrinkCard(String name, double basePrice, int imageID) {
        VBox card = new VBox(10);
        card.setPrefWidth(160);
        card.setAlignment(Pos.CENTER);
        card.setStyle("""
            -fx-border-color: #ccc;
            -fx-background-color: #f9f9f9;
            -fx-border-radius: 8;
            -fx-padding: 12;
            -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.1), 4, 0, 0, 2);
        """);

        // Load image
        Image image = loadMenuImage(imageID);
        ImageView imageView = new ImageView(image);
        imageView.setFitWidth(100);
        imageView.setFitHeight(100);
        imageView.setPreserveRatio(true);

        Label nameLabel = new Label(name);
        nameLabel.setStyle("-fx-font-weight: bold; -fx-font-size: 14px;");
        Label priceLabel = new Label(String.format("$%.2f", basePrice));
        priceLabel.setStyle("-fx-text-fill: #444;");
        Button selectButton = new Button("Select");
        selectButton.setStyle("-fx-background-color: #a6b1b7; -fx-text-fill: white;");


        selectButton.setOnAction(e -> showDrinkOptions(name, basePrice));

        card.getChildren().addAll(imageView, nameLabel, priceLabel, selectButton);
        return card;
    }

    // ===== DRINK OPTIONS POP-UP =====
    private void showDrinkOptions(String drinkName, double basePrice) {
        Dialog<ButtonType> dialog = new Dialog<>();
        dialog.setTitle("Customize " + drinkName);
        dialog.setHeaderText("Select ingredients / options");

        VBox content = new VBox(8);
        content.setPadding(new Insets(10));

        List<String> baseIngredients = new ArrayList<>(List.of("Milk", "Sugar", "Boba", "Ice"));
        List<String> extras = new ArrayList<>(List.of("Aloe", "Pudding", "Jelly", "Extra Boba"));

        Label baseLabel = new Label("Remove Ingredients:");
        content.getChildren().add(baseLabel);
        List<CheckBox> baseChecks = new ArrayList<>();
        for (String ingr : baseIngredients) {
            CheckBox cb = new CheckBox(ingr);
            cb.setSelected(true);
            baseChecks.add(cb);
            content.getChildren().add(cb);
        }

        Label extraLabel = new Label("\nAdd Extras (+$0.50 each):");
        content.getChildren().add(extraLabel);
        List<CheckBox> extraChecks = new ArrayList<>();
        for (String ingr : extras) {
            CheckBox cb = new CheckBox(ingr);
            extraChecks.add(cb);
            content.getChildren().add(cb);
        }

        dialog.getDialogPane().setContent(content);
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.OK, ButtonType.CANCEL);

        dialog.showAndWait().ifPresent(response -> {
            if (response == ButtonType.OK) {
                double itemPrice = basePrice;
                StringBuilder description = new StringBuilder(drinkName + " [");

                for (CheckBox cb : baseChecks) {
                    if (!cb.isSelected()) description.append("-").append(cb.getText()).append(" ");
                }

                for (CheckBox cb : extraChecks) {
                    if (cb.isSelected()) {
                        description.append("+").append(cb.getText()).append(" ");
                        itemPrice += 0.50;
                    }
                }

                description.append("]");
                addToOrder(description.toString().trim(), itemPrice);
            }
        });
    }

    // ===== ADD TO ORDER =====
    private void addToOrder(String itemName, double price) {
        orderListView.getItems().add(String.format("%s - $%.2f", itemName, price));
        total += price;
        totalLabel.setText(String.format("Total: $%.2f", total));
    }

    // ===== REMOVE ITEM =====
    @FXML
    private void handleRemoveItemClick(ActionEvent event) {
        String selectedItem = orderListView.getSelectionModel().getSelectedItem();
        if (selectedItem != null) {
            String priceStr = selectedItem.substring(selectedItem.lastIndexOf('$') + 1);
            try {
                double price = Double.parseDouble(priceStr);
                total -= price;
                totalLabel.setText(String.format("Total: $%.2f", total));
            } catch (NumberFormatException e) {
                System.err.println("Error parsing price: " + e.getMessage());
            }
            orderListView.getItems().remove(selectedItem);
        } else {
            Alert alert = new Alert(Alert.AlertType.WARNING);
            alert.setTitle("No Item Selected");
            alert.setHeaderText(null);
            alert.setContentText("Please select an item to remove from the order.");
            alert.showAndWait();
        }
    }

    // ===== SUBMIT ORDER =====
    @FXML
    private void handleSubmitOrderClick(ActionEvent event) {
        System.out.println("Submit Order button clicked!");

        if (orderListView.getItems().isEmpty()) {
            Alert alert = new Alert(Alert.AlertType.WARNING);
            alert.setTitle("Empty Order");
            alert.setHeaderText(null);
            alert.setContentText("Cannot submit an empty order!");
            alert.showAndWait();
            return;
        }

        boolean success = saveOrderToDatabase();

        Alert alert = new Alert(success ? Alert.AlertType.INFORMATION : Alert.AlertType.ERROR);
        alert.setTitle(success ? "Order Submitted" : "Database Error");
        alert.setHeaderText(null);
        alert.setContentText(success
                ? "Your order has been submitted successfully!"
                : "There was a problem saving your order to the database.");
        alert.showAndWait();

        if (success) {
            orderListView.getItems().clear();
            total = 0.0;
            totalLabel.setText("Total: $0.00");
        }
    }

    // ===== SAVE ORDER TO DATABASE =====
    private boolean saveOrderToDatabase() {
        try (Connection conn = DatabaseConnector.getConnection()) {
            if (conn == null) {
                System.err.println("Could not connect to database for saving order.");
                return false;
            }

            String insertOrder = """
                INSERT INTO ordertest (orderID, employeeID, orderLocation, orderDate, orderTotal)
                VALUES ((SELECT COALESCE(MAX(orderID), 0) + 1 FROM ordertest), ?, ?, ?, ?)
            """;

            try (PreparedStatement stmt = conn.prepareStatement(insertOrder)) {
                stmt.setInt(1, 1); // hardcoded employeeID for now

                stmt.setString(2, "College Station");

                // Time is randomized.
                // Date will either be current system date or modified by user input
                randomizeTime();
                Timestamp sqlTimestamp = Timestamp.valueOf(currDateTime);
                stmt.setTimestamp(3, sqlTimestamp);

                stmt.setDouble(4, total);

                int rowsInserted = stmt.executeUpdate();
                System.out.println("Rows inserted: " + rowsInserted);
                return rowsInserted > 0;
            }

        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }
    @FXML
    private void handleBackToLogin() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/app/LoginView.fxml"));
            Scene scene = new Scene(loader.load(), 800, 600);
            Stage stage = (Stage) btnBack.getScene().getWindow();
            stage.setTitle("POS — Login");
            stage.setScene(scene);
        } catch (Exception e) {
            e.printStackTrace();
            new Alert(Alert.AlertType.ERROR, "Error returning to login.").showAndWait();
        }
    }
}

